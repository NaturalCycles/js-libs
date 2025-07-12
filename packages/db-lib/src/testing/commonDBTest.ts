import { _sortBy } from '@naturalcycles/js-lib/array/array.util.js'
import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { _deepFreeze, _filterObject, _pick } from '@naturalcycles/js-lib/object'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import type { CommonDB } from '../commondb/common.db.js'
import { CommonDBType } from '../commondb/common.db.js'
import { DBQuery } from '../query/dbQuery.js'
import type { TestItemDBM } from './test.model.js'
import {
  createTestItemDBM,
  createTestItemsDBM,
  TEST_TABLE,
  testItemBMJsonSchema,
} from './test.model.js'

/**
 * All options default to `false`.
 */
export interface CommonDBImplementationQuirks {
  /**
   * Example: airtableId
   */
  allowExtraPropertiesInResponse?: boolean

  /**
   * Example: AirtableDB
   */
  allowBooleansAsUndefined?: boolean
}

export async function runCommonDBTest(
  db: CommonDB,
  quirks: CommonDBImplementationQuirks = {},
): Promise<void> {
  // this is because vitest cannot be "required" from cjs
  const { test, expect } = await import('vitest')

  const { support } = db
  const items = createTestItemsDBM(3)
  _deepFreeze(items)
  const item1 = items[0]!

  const queryAll = (): DBQuery<TestItemDBM> => DBQuery.create<TestItemDBM>(TEST_TABLE)

  test('ping', async () => {
    await db.ping()
  })

  // CREATE TABLE, DROP
  if (support.createTable) {
    test('createTable, dropIfExists=true', async () => {
      await db.createTable(TEST_TABLE, testItemBMJsonSchema, { dropIfExists: true })
    })
  }

  if (support.queries) {
    // DELETE ALL initially
    test('deleteByIds test items', async () => {
      const { rows } = await db.runQuery(queryAll().select(['id']))
      await db.deleteByQuery(
        queryAll().filterIn(
          'id',
          rows.map(i => i.id),
        ),
      )
    })

    // QUERY empty
    test('runQuery(all), runQueryCount should return empty', async () => {
      expect((await db.runQuery(queryAll())).rows).toEqual([])
      expect(await db.runQueryCount(queryAll())).toBe(0)
    })
  }

  // GET empty
  test('getByIds(item1.id) should return empty', async () => {
    const [item1Loaded] = await db.getByIds(TEST_TABLE, [item1.id])
    // console.log(a)
    expect(item1Loaded).toBeUndefined()
  })

  test('getByIds([]) should return []', async () => {
    expect(await db.getByIds(TEST_TABLE, [])).toEqual([])
  })

  test('getByIds(...) should return empty', async () => {
    expect(await db.getByIds(TEST_TABLE, ['abc', 'abcd'])).toEqual([])
  })

  // TimeMachine
  if (support.timeMachine) {
    test('getByIds(...) 10 minutes ago should return []', async () => {
      expect(
        await db.getByIds(TEST_TABLE, [item1.id, 'abc'], {
          readAt: localTime.now().minus(10, 'minute').unix,
        }),
      ).toEqual([])
    })
  }

  // SAVE
  if (support.nullValues) {
    test('should allow to save and load null values', async () => {
      const item3 = {
        ...createTestItemDBM(3),
        k2: null,
      }
      _deepFreeze(item3)
      await db.saveBatch(TEST_TABLE, [item3])
      const item3Loaded = (await db.getByIds<TestItemDBM>(TEST_TABLE, [item3.id]))[0]!
      expectMatch([item3], [item3Loaded], quirks)
      expect(item3Loaded.k2).toBeNull()
    })
  }

  if (db.dbType === CommonDBType.document) {
    test('undefined values should not be saved/loaded', async () => {
      const item3 = {
        ...createTestItemDBM(3),
        k2: undefined,
      }
      _deepFreeze(item3)
      const expected = { ...item3 }
      delete expected.k2

      await db.saveBatch(TEST_TABLE, [item3])
      const item3Loaded = (await db.getByIds<TestItemDBM>(TEST_TABLE, [item3.id]))[0]!
      expectMatch([expected], [item3Loaded], quirks)
      expect(item3Loaded.k2).toBeUndefined()
      expect(Object.keys(item3Loaded)).not.toContain('k2')
    })
  }

  if (support.updateSaveMethod) {
    test('saveBatch UPDATE method should throw', async () => {
      await expect(db.saveBatch(TEST_TABLE, items, { saveMethod: 'update' })).rejects.toThrow()
    })
  }

  test('saveBatch test items', async () => {
    await db.saveBatch(TEST_TABLE, items)
  })

  test('saveBatch should throw on null id', async () => {
    await expect(db.saveBatch(TEST_TABLE, [{ ...item1, id: null as any }])).rejects.toThrow()
  })

  if (support.insertSaveMethod) {
    test('saveBatch INSERT method should throw', async () => {
      await expect(db.saveBatch(TEST_TABLE, items, { saveMethod: 'insert' })).rejects.toThrow()
    })
  }

  if (support.updateSaveMethod) {
    test('saveBatch UPDATE method should pass', async () => {
      await db.saveBatch(TEST_TABLE, items, { saveMethod: 'update' })
    })
  }

  // GET not empty
  test('getByIds all items', async () => {
    const rows = await db.getByIds<TestItemDBM>(TEST_TABLE, items.map(i => i.id).concat('abcd'))
    expectMatch(
      items,
      _sortBy(rows, r => r.id),
      quirks,
    )
  })

  // QUERY
  if (support.queries) {
    test('runQuery(all) should return all items', async () => {
      let { rows } = await db.runQuery(queryAll())
      rows = _sortBy(rows, r => r.id) // because query doesn't specify order here
      expectMatch(items, rows, quirks)
    })

    if (support.dbQueryFilter) {
      test('query even=true', async () => {
        const q = new DBQuery<TestItemDBM>(TEST_TABLE).filter('even', '==', true)
        let { rows } = await db.runQuery(q)
        if (!support.dbQueryOrder) rows = _sortBy(rows, r => r.id)
        expectMatch(
          items.filter(i => i.even),
          rows,
          quirks,
        )
      })
    }

    if (support.dbQueryOrder) {
      test('query order by k1 desc', async () => {
        const q = new DBQuery<TestItemDBM>(TEST_TABLE).order('k1', true)
        const { rows } = await db.runQuery(q)
        expectMatch([...items].reverse(), rows, quirks)
      })
    }

    if (support.dbQuerySelectFields) {
      test('projection query with only ids', async () => {
        const q = new DBQuery<TestItemDBM>(TEST_TABLE).select(['id'])
        let { rows } = await db.runQuery(q)
        rows = _sortBy(rows, r => r.id) // cause order is not specified
        expectMatch(
          items.map(item => _pick(item, ['id'])),
          rows,
          quirks,
        )
      })

      test('projection query without ids', async () => {
        const q = new DBQuery<TestItemDBM>(TEST_TABLE).select(['k1'])
        let { rows } = await db.runQuery(q)
        rows = _sortBy(rows, r => r.k1) // cause order is not specified
        expectMatch(
          items.map(item => _pick(item, ['k1'])),
          rows,
          quirks,
        )
      })

      test('projection query empty fields (edge case)', async () => {
        const q = new DBQuery<TestItemDBM>(TEST_TABLE).select([])
        const { rows } = await db.runQuery(q)
        expectMatch(
          items.map(() => ({})),
          rows,
          quirks,
        )
      })
    }

    test('runQueryCount should return 3', async () => {
      expect(await db.runQueryCount(new DBQuery(TEST_TABLE))).toBe(3)
    })
  }

  // STREAM
  if (support.streaming) {
    test('streamQuery all', async () => {
      let rows = await db.streamQuery(queryAll()).toArray()

      rows = _sortBy(rows, r => r.id) // cause order is not specified in DBQuery
      expectMatch(items, rows, quirks)
    })
  }

  // getTables
  test('getTables, getTableSchema (if supported)', async () => {
    const tables = await db.getTables()
    // console.log({ tables })

    if (support.tableSchemas) {
      await pMap(tables, async table => {
        const schema = await db.getTableSchema(table)
        // console.log(schema)
        expect(schema.$id).toBe(`${table}.schema.json`)
      })
    }
  })

  // DELETE BY
  if (support.queries && support.dbQueryFilter) {
    test('deleteByQuery even=false', async () => {
      const q = new DBQuery<TestItemDBM>(TEST_TABLE).filter('even', '==', false)
      const deleted = await db.deleteByQuery(q)
      expect(deleted).toBe(items.filter(item => !item.even).length)

      expect(await db.runQueryCount(queryAll())).toBe(1)
    })
  }

  // BUFFER
  if (support.bufferValues) {
    test('buffer values', async () => {
      const s = 'helloWorld 1'
      const b1 = Buffer.from(s)

      const item = {
        ...createTestItemDBM(1),
        b1,
      }
      await db.saveBatch(TEST_TABLE, [item])
      const loaded = (await db.getByIds<TestItemDBM>(TEST_TABLE, [item.id]))[0]!
      const b1Loaded = loaded.b1!
      // console.log({
      //   b11: typeof b1,
      //   b12: typeof b1Loaded,
      //   l1: b1.length,
      //   l2: b1Loaded.length,
      //   b1,
      //   b1Loaded,
      // })
      expect(b1Loaded).toEqual(b1)
      expect(b1Loaded.toString()).toBe(s)
    })
  }

  if (support.transactions) {
    /**
     * Returns expected items in the DB after the preparation.
     */
    async function prepare(): Promise<TestItemDBM[]> {
      // cleanup
      await db.deleteByQuery(queryAll())

      const itemsToSave: TestItemDBM[] = [items[0]!, { ...items[2]!, k1: 'k1_mod' }]
      await db.saveBatch(TEST_TABLE, itemsToSave)
      return itemsToSave
    }

    test('transaction happy path', async () => {
      // cleanup
      await db.deleteByQuery(queryAll())

      // saveBatch [item1, 2, 3]
      // save item3 with k1: k1_mod
      // delete item2
      // remaining: item1, item3_with_k1_mod
      await db.runInTransaction(async tx => {
        await tx.saveBatch(TEST_TABLE, items)
        await tx.saveBatch(TEST_TABLE, [{ ...items[2]!, k1: 'k1_mod' }])
        await tx.deleteByIds(TEST_TABLE, [items[1]!.id])
      })

      const { rows } = await db.runQuery(queryAll())
      const expected = [items[0], { ...items[2]!, k1: 'k1_mod' }]
      expectMatch(expected, rows, quirks)
    })

    test('createTransaction happy path', async () => {
      // cleanup
      await db.deleteByQuery(queryAll())

      const tx = await db.createTransaction()
      await tx.saveBatch(TEST_TABLE, items)
      await tx.saveBatch(TEST_TABLE, [{ ...items[2]!, k1: 'k1_mod' }])
      await tx.deleteByIds(TEST_TABLE, [items[1]!.id])
      await tx.commit()

      const { rows } = await db.runQuery(queryAll())
      const expected = [items[0], { ...items[2]!, k1: 'k1_mod' }]
      expectMatch(expected, rows, quirks)
    })

    test('transaction rollback', async () => {
      const expected = await prepare()

      let err: any

      try {
        await db.runInTransaction(async tx => {
          await tx.deleteByIds(TEST_TABLE, [items[2]!.id])
          // It should fail on id == null
          await tx.saveBatch(TEST_TABLE, [{ ...items[0]!, k1: 5, id: null as any }])
        })
      } catch (err_) {
        err = err_
      }

      expect(err).toBeDefined()

      const { rows } = await db.runQuery(queryAll())
      expectMatch(expected, rows, quirks)
    })
  }

  if (support.patchByQuery) {
    test('patchByQuery', async () => {
      // cleanup, reset initial data
      await db.deleteByQuery(queryAll())
      await db.saveBatch(TEST_TABLE, items)

      const patch: Partial<TestItemDBM> = {
        k3: 5,
        k2: 'abc',
      }

      await db.patchByQuery(DBQuery.create<TestItemDBM>(TEST_TABLE).filterEq('even', true), patch)

      const { rows } = await db.runQuery(queryAll())
      const expected = items.map(r => {
        if (r.even) {
          return { ...r, ...patch }
        }
        return r
      })
      expectMatch(expected, rows, quirks)
    })
  }

  if (support.increment) {
    test('incrementBatch', async () => {
      // cleanup, reset initial data
      await db.deleteByQuery(queryAll())
      await db.saveBatch(TEST_TABLE, items)

      await db.incrementBatch(TEST_TABLE, 'k3', { id1: 1, id2: 2 })

      const { rows } = await db.runQuery(queryAll())
      const expected = items.map(r => {
        if (r.id === 'id1') {
          return { ...r, k3: 2 }
        }
        if (r.id === 'id2') {
          return { ...r, k3: 4 }
        }
        return r
      })
      expectMatch(expected, rows, quirks)
    })
  }

  if (support.queries) {
    test('cleanup', async () => {
      // CLEAN UP
      await db.deleteByQuery(queryAll())
    })
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
