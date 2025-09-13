import { _sortBy } from '@naturalcycles/js-lib/array/array.util.js'
import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { _deepCopy, _filterObject, _omit, _pick } from '@naturalcycles/js-lib/object'
import { getJoiValidationFunction } from '@naturalcycles/nodejs-lib/joi'
import { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import { CommonDao } from '../commondao/common.dao.js'
import type { CommonDB } from '../commondb/common.db.js'
import { DBQuery } from '../query/dbQuery.js'
import type { CommonDBImplementationQuirks } from './commonDBTest.js'
import type { TestItemBM } from './test.model.js'
import {
  createTestItemBM,
  createTestItemsBM,
  TEST_TABLE,
  testItemBMJsonSchema,
  testItemBMSchema,
} from './test.model.js'

export async function runCommonDaoTest(
  db: CommonDB,
  quirks: CommonDBImplementationQuirks = {},
): Promise<void> {
  // this is because vitest cannot be "required" from cjs
  const { test, expect } = await import('vitest')

  const { support } = db
  const dao = new CommonDao({
    table: TEST_TABLE,
    db,
    validateBM: getJoiValidationFunction(testItemBMSchema),
  })

  const items = createTestItemsBM(3)
  const itemsClone = _deepCopy(items)
  // deepFreeze(items) // mutation of id/created/updated is allowed now! (even expected)
  const item1 = items[0]!

  const expectedItems = items.map(i => ({
    ...i,
    updated: expect.any(Number),
  }))

  test('ping', async () => {
    await dao.ping()
  })

  // CREATE TABLE, DROP
  if (support.createTable) {
    test('createTable, dropIfExists=true', async () => {
      await dao.createTable(testItemBMJsonSchema, { dropIfExists: true })
    })
  }

  if (support.queries) {
    // DELETE ALL initially
    test('deleteByIds test items', async () => {
      const rows = await dao.query().select(['id']).runQuery()
      await db.deleteByQuery(
        DBQuery.create(TEST_TABLE).filter(
          'id',
          'in',
          rows.map(r => r.id),
        ),
      )
    })

    // QUERY empty
    test('runQuery(all), runQueryCount should return empty', async () => {
      expect(await dao.query().runQuery()).toEqual([])
      expect(await dao.query().runQueryCount()).toBe(0)
    })
  }

  // GET empty
  test('getByIds(item1.id) should return empty', async () => {
    const [item1Loaded] = await dao.getByIds([item1.id])
    expect(item1Loaded).toBeUndefined()
    expect(await dao.getById(item1.id)).toBeNull()
  })

  test('getByIds([]) should return []', async () => {
    expect(await dao.getByIds([])).toEqual([])
  })

  test('getByIds(...) should return empty', async () => {
    expect(await dao.getByIds(['abc', 'abcd'])).toEqual([])
  })

  // TimeMachine
  if (support.timeMachine) {
    test('getByIds(...) 10 minutes ago should return []', async () => {
      expect(
        await dao.getByIds([item1.id, 'abc'], {
          readAt: localTime.now().minus(10, 'minute').unix,
        }),
      ).toEqual([])
    })
  }

  // SAVE
  if (support.nullValues) {
    test('should allow to save and load null values', async () => {
      const item3 = {
        ...createTestItemBM(3),
        k2: null,
      }
      // deepFreeze(item3) // no, Dao is expected to mutate object to add id, created, updated
      await dao.save(item3)
      const item3Loaded = await dao.requireById(item3.id)
      expectMatch([item3], [item3Loaded], quirks)
      expect(item3Loaded.k2).toBeNull()
      expect(Object.keys(item3)).toContain('k2')
      expect(item3.k2).toBeNull()
    })
  }

  test('undefined values should not be saved/loaded', async () => {
    const item3 = {
      ...createTestItemBM(3),
      k2: undefined,
    }
    // deepFreeze(item3) // no, Dao is expected to mutate object to add id, created, updated
    const expected = { ...item3 }
    delete expected.k2

    await dao.save(item3)

    expected.updated = item3.updated // as it's mutated

    const item3Loaded = await dao.requireById(item3.id)
    expectMatch([expected], [item3Loaded], quirks)
    expect(item3Loaded.k2).toBeUndefined()
    expect(Object.keys(item3Loaded)).not.toContain('k2')
    expect(Object.keys(item3)).toContain('k2')
    expect(item3.k2).toBeUndefined()
  })

  test('saveBatch test items', async () => {
    const itemsSaved = await dao.saveBatch(items)
    expect(itemsSaved[0]).toBe(items[0]) // expect "same object" returned

    // no unnecessary mutation
    const { updated: _, ...clone } = itemsClone[0]!
    expect(items[0]).toMatchObject(clone)

    expectMatch(expectedItems, itemsSaved, quirks)
  })

  if (support.increment) {
    test('increment', async () => {
      await dao.incrementBatch('k3', { id1: 1, id2: 2 })
      let rows = await dao.query().runQuery()
      rows = _sortBy(rows, r => r.id)
      const expected = expectedItems.map(r => {
        if (r.id === 'id1') {
          return {
            ...r,
            k3: r.k3! + 1,
          }
        }
        if (r.id === 'id2') {
          return {
            ...r,
            k3: r.k3! + 2,
          }
        }
        return r
      })
      expectMatch(expected, rows, quirks)

      // reset the changes
      await dao.increment('k3', 'id1', -1)
      await dao.increment('k3', 'id2', -2)
    })
  }

  // GET not empty
  test('getByIds all items', async () => {
    const rows = await dao.getByIds(items.map(i => i.id).concat('abcd'))
    expectMatch(
      expectedItems,
      _sortBy(rows, r => r.id),
      quirks,
    )
  })

  // QUERY
  if (support.queries) {
    test('runQuery(all) should return all items', async () => {
      let rows = await dao.query().runQuery()
      rows = _sortBy(rows, r => r.id)
      expectMatch(expectedItems, rows, quirks)
    })

    if (support.dbQueryFilter) {
      test('query even=true', async () => {
        let rows = await dao.query().filter('even', '==', true).runQuery()
        rows = _sortBy(rows, r => r.id)
        expectMatch(
          expectedItems.filter(i => i.even),
          rows,
          quirks,
        )
      })

      test('query nested property', async () => {
        let rows = await dao
          .query()
          .filter('nested.foo' as any, '==', 1)
          .runQuery()
        rows = _sortBy(rows, r => r.id)
        expectMatch(
          expectedItems.filter(i => i.nested?.foo === 1),
          rows,
          quirks,
        )
      })
    }

    if (support.dbQueryOrder) {
      test('query order by k1 desc', async () => {
        const rows = await dao.query().order('k1', true).runQuery()
        expectMatch([...expectedItems].reverse(), rows, quirks)
      })
    }

    if (support.dbQuerySelectFields) {
      test('projection query with only ids', async () => {
        let rows = await dao.query().select(['id']).runQuery()
        rows = _sortBy(rows, r => r.id)
        expectMatch(
          expectedItems.map(item => _pick(item, ['id'])),
          rows,
          quirks,
        )
      })
    }

    test('runQueryCount should return 3', async () => {
      expect(await dao.query().runQueryCount()).toBe(3)
    })
  }

  // STREAM
  if (support.streaming) {
    test('streamQueryForEach all', async () => {
      let rows: TestItemBM[] = []
      await dao
        .query()
        .streamQuery()
        .forEachSync(bm => void rows.push(bm))

      rows = _sortBy(rows, r => r.id)
      expectMatch(expectedItems, rows, quirks)
    })

    test('streamQuery all', async () => {
      let rows: TestItemBM[] = await dao.query().streamQuery().toArray()

      rows = _sortBy(rows, r => r.id)
      expectMatch(expectedItems, rows, quirks)
    })

    test('streamQueryIdsForEach all', async () => {
      let ids: string[] = []
      await dao
        .query()
        .streamQueryIds()
        .forEachSync(id => void ids.push(id))
      ids = ids.sort()
      expectMatch(
        expectedItems.map(i => i.id),
        ids,
        quirks,
      )
    })

    test('streamQueryIds all', async () => {
      let ids = await dao.query().streamQueryIds().toArray()
      ids = ids.sort()
      expectMatch(
        expectedItems.map(i => i.id),
        ids,
        quirks,
      )
    })

    test('streamSaveTransform', async () => {
      const items2 = createTestItemsBM(2).map(i => ({ ...i, id: i.id + '_str' }))
      const ids = items2.map(i => i.id)

      await Pipeline.fromArray(items2).transformMany(dao.streamSaveTransforms()).run()

      const items2Loaded = await dao.getByIds(ids)
      expectMatch(items2, items2Loaded, quirks)

      // cleanup
      await dao.query().filterIn('id', ids).deleteByQuery()
    })
  }

  // DELETE BY
  if (support.queries) {
    test('deleteByQuery even=false', async () => {
      const deleted = await dao.query().filter('even', '==', false).deleteByQuery()
      expect(deleted).toBe(items.filter(item => !item.even).length)
      expect(await dao.query().runQueryCount()).toBe(1)
    })

    test('cleanup', async () => {
      // CLEAN UP
      await dao.query().deleteByQuery()
    })
  }

  if (support.transactions) {
    /**
     * Returns expected items in the DB after the preparation.
     */
    async function prepare(): Promise<TestItemBM[]> {
      // cleanup
      await dao.query().deleteByQuery()

      const itemsToSave: TestItemBM[] = [items[0]!, { ...items[2]!, k1: 'k1_mod' }]
      await dao.saveBatch(itemsToSave)
      return itemsToSave
    }

    test('transaction happy path', async () => {
      // cleanup
      await dao.query().deleteByQuery()

      // Test that id, created, updated are created
      const now = localTime.nowUnix()

      await dao.runInTransaction(async tx => {
        const row = _omit(item1, ['id', 'created', 'updated'])
        await tx.save(dao, row)
      })

      const loaded = await dao.query().runQuery()
      expect(loaded.length).toBe(1)
      expect(loaded[0]!.id).toBeDefined()
      expect(loaded[0]!.created).toBeGreaterThanOrEqual(now)
      expect(loaded[0]!.updated).toBe(loaded[0]!.created)

      await dao.runInTransaction(async tx => {
        await tx.deleteById(dao, loaded[0]!.id)
      })

      // saveBatch [item1, 2, 3]
      // save item3 with k1: k1_mod
      // delete item2
      // remaining: item1, item3_with_k1_mod
      await dao.runInTransaction(async tx => {
        await tx.saveBatch(dao, items)
        await tx.save(dao, { ...items[2]!, k1: 'k1_mod' })
        await tx.deleteById(dao, items[1]!.id)
      })

      const rows = await dao.query().runQuery()
      const expected = [items[0], { ...items[2]!, k1: 'k1_mod' }]
      expectMatch(expected, rows, quirks)
    })

    if (support.createTransaction) {
      test('createTransaction happy path', async () => {
        // cleanup
        await dao.query().deleteByQuery()

        // Test that id, created, updated are created
        const now = localTime.nowUnix()

        const row = _omit(item1, ['id', 'created', 'updated'])
        let tx = await dao.createTransaction()
        await tx.save(dao, row)
        await tx.commit()

        const loaded = await dao.query().runQuery()
        expect(loaded.length).toBe(1)
        expect(loaded[0]!.id).toBeDefined()
        expect(loaded[0]!.created).toBeGreaterThanOrEqual(now)
        expect(loaded[0]!.updated).toBe(loaded[0]!.created)

        tx = await dao.createTransaction()
        await tx.deleteById(dao, loaded[0]!.id)
        await tx.commit()

        // saveBatch [item1, 2, 3]
        // save item3 with k1: k1_mod
        // delete item2
        // remaining: item1, item3_with_k1_mod
        tx = await dao.createTransaction()
        await tx.saveBatch(dao, items)
        await tx.save(dao, { ...items[2]!, k1: 'k1_mod' })
        await tx.deleteById(dao, items[1]!.id)
        await tx.commit()

        const rows = await dao.query().runQuery()
        const expected = [items[0], { ...items[2]!, k1: 'k1_mod' }]
        expectMatch(expected, rows, quirks)
      })
    }

    test('transaction rollback', async () => {
      const expected = await prepare()

      let err: any

      try {
        await dao.runInTransaction(async tx => {
          await tx.deleteById(dao, items[2]!.id)
          await tx.save(dao, { ...items[0]!, k1: 5 as any }) // it should fail here
        })
      } catch (err_) {
        err = err_
      }

      expect(err).toBeDefined()
      expect(err).toBeInstanceOf(Error)

      const rows = await dao.query().runQuery()
      expectMatch(expected, rows, quirks)
    })

    if (support.createTransaction) {
      test('createTransaction rollback', async () => {
        const expected = await prepare()

        let err: any
        try {
          const tx = await dao.createTransaction()
          await tx.deleteById(dao, items[2]!.id)
          await tx.save(dao, { ...items[0]!, k1: 5 as any }) // it should fail here
          await tx.commit()
        } catch (err_) {
          err = err_
        }

        expect(err).toBeDefined()
        expect(err).toBeInstanceOf(Error)

        const rows = await dao.query().runQuery()
        expectMatch(expected, rows, quirks)
      })
    }

    if (support.queries) {
      test('transaction cleanup', async () => {
        await dao.query().deleteByQuery()
      })
    }
  }

  function expectMatch(expected: any[], actual: any[], quirks: CommonDBImplementationQuirks): void {
    // const expectedSorted = sortObjectDeep(expected)
    // const actualSorted = sortObjectDeep(actual)

    if (quirks.allowBooleansAsUndefined) {
      expected = expected.map(r => {
        return typeof r !== 'object' ? r : _filterObject(r, (_k, v) => v !== false)
      })
    }

    if (quirks.allowExtraPropertiesInResponse) {
      expect(actual).toMatchObject(expected)
    } else {
      expect(actual).toEqual(expected)
    }
  }
}
