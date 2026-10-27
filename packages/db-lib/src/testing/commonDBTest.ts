import { _sortBy } from '@naturalcycles/js-lib/array/sort.js'
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
  testItemBMSchema,
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
  const { afterAll, beforeAll, expect, it } = await import('vitest')

  const { support } = db
  const items = createTestItemsDBM(3)
  _deepFreeze(items)
  const item1 = items[0]!

  const queryAll = (): DBQuery<TestItemDBM> => DBQuery.create<TestItemDBM>(TEST_TABLE)

  beforeAll(async () => {
    // Tests in this suite are not isolated: a failed run can leave rows behind for the next run
    if (support.createTable) {
      await db.createTable(TEST_TABLE, testItemBMSchema.build(), { dropIfExists: true })
    }

    // DELETE ALL initially
    if (support.queries) {
      const { rows } = await db.runQuery(queryAll().select(['id']))
      await db.deleteByQuery(
        queryAll().filterIn(
          'id',
          rows.map(i => i.id),
        ),
      )
    }
  })

  afterAll(async () => {
    // CLEAN UP
    if (support.queries) {
      await db.deleteByQuery(queryAll())
    }
  })

  it('should respond to ping', async () => {
    await db.ping()
  })

  // CREATE TABLE, DROP
  if (support.createTable) {
    it('should create the table, dropping an existing one', async () => {
      await db.createTable(TEST_TABLE, testItemBMSchema.build(), { dropIfExists: true })
    })
  }

  if (support.queries) {
    // QUERY empty
    it('should return no rows and a count of 0 for an empty table', async () => {
      expect((await db.runQuery(queryAll())).rows).toEqual([])
      expect(await db.runQueryCount(queryAll())).toBe(0)
    })
  }

  // GET empty
  it('should return an empty array for ids that are not saved', async () => {
    expect(await db.getByIds(TEST_TABLE, [item1.id, 'abc', 'abcd'])).toEqual([])
  })

  it('should return an empty array for getByIds without ids', async () => {
    expect(await db.getByIds(TEST_TABLE, [])).toEqual([])
  })

  // TimeMachine
  if (support.timeMachine) {
    it('should return an empty array for a read 10 minutes back in time', async () => {
      expect(
        await db.getByIds(TEST_TABLE, [item1.id, 'abc'], {
          readAt: localTime.now().minus(10, 'minute').unix,
        }),
      ).toEqual([])
    })
  }

  // SAVE
  if (support.nullValues) {
    it('should allow to save and load null values', async () => {
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
    it('should not store properties with undefined values', async () => {
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
    it('should throw on saveBatch with the update method when rows do not exist', async () => {
      await expect(db.saveBatch(TEST_TABLE, items, { saveMethod: 'update' })).rejects.toThrow()
    })
  }

  it('should save the test items', async () => {
    await db.saveBatch(TEST_TABLE, items)
  })

  it('should throw on saveBatch of a row with a null id', async () => {
    await expect(db.saveBatch(TEST_TABLE, [{ ...item1, id: null as any }])).rejects.toThrow()
  })

  if (support.insertSaveMethod) {
    it('should throw on saveBatch with the insert method when rows exist', async () => {
      await expect(db.saveBatch(TEST_TABLE, items, { saveMethod: 'insert' })).rejects.toThrow()
    })
  }

  if (support.updateSaveMethod) {
    it('should save with the update method when rows exist', async () => {
      await db.saveBatch(TEST_TABLE, items, { saveMethod: 'update' })
    })
  }

  // GET not empty
  it('should return all saved items by ids, skipping unknown ids', async () => {
    const rows = await db.getByIds<TestItemDBM>(TEST_TABLE, items.map(i => i.id).concat('abcd'))
    expectMatch(
      items,
      _sortBy(rows, r => r.id),
      quirks,
    )
  })

  // QUERY
  if (support.queries) {
    it('should return all items from a query without conditions', async () => {
      let { rows } = await db.runQuery(queryAll())
      rows = _sortBy(rows, r => r.id) // because query doesn't specify order here
      expectMatch(items, rows, quirks)
    })

    if (support.dbQueryFilter) {
      it('should filter rows by equality', async () => {
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
      it('should order rows descending', async () => {
        const q = new DBQuery<TestItemDBM>(TEST_TABLE).order('k1', true)
        const { rows } = await db.runQuery(q)
        expectMatch(items.toReversed(), rows, quirks)
      })
    }

    if (support.dbQuerySelectFields) {
      it('should select only the id', async () => {
        const q = new DBQuery<TestItemDBM>(TEST_TABLE).select(['id'])
        let { rows } = await db.runQuery(q)
        rows = _sortBy(rows, r => r.id) // cause order is not specified
        expectMatch(
          items.map(item => _pick(item, ['id'])),
          rows,
          quirks,
        )
      })

      it('should select a property without the id', async () => {
        const q = new DBQuery<TestItemDBM>(TEST_TABLE).select(['k1'])
        let { rows } = await db.runQuery(q)
        rows = _sortBy(rows, r => r.k1) // cause order is not specified
        expectMatch(
          items.map(item => _pick(item, ['k1'])),
          rows,
          quirks,
        )
      })

      it('should return empty rows when selecting no properties', async () => {
        const q = new DBQuery<TestItemDBM>(TEST_TABLE).select([])
        const { rows } = await db.runQuery(q)
        expectMatch(
          items.map(() => ({})),
          rows,
          quirks,
        )
      })
    }

    it('should count all saved items', async () => {
      expect(await db.runQueryCount(new DBQuery(TEST_TABLE))).toBe(3)
    })
  }

  // STREAM
  if (support.streaming) {
    it('should stream all items', async () => {
      let rows = await db.streamQuery(queryAll()).toArray()

      rows = _sortBy(rows, r => r.id) // cause order is not specified in DBQuery
      expectMatch(items, rows, quirks)
    })
  }

  // getTables
  it('should list the test table among the tables, if the db can list tables', async () => {
    const tables = await db.getTables()
    // console.log({ tables })

    // FirestoreDB and AirtableDB cannot list their tables and return []
    if (tables.length) expect(tables).toContain(TEST_TABLE)
  })

  if (support.tableSchemas) {
    it('should return a schema $id matching each listed table', async () => {
      const tables = await db.getTables()

      await pMap(tables, async table => {
        const schema = await db.getTableSchema(table)
        // console.log(schema)
        expect(schema.$id).toBe(`${table}.schema.json`)
      })
    })
  }

  // DELETE BY
  if (support.queries && support.dbQueryFilter) {
    it('should delete rows by a filter and return the deleted count', async () => {
      const q = new DBQuery<TestItemDBM>(TEST_TABLE).filter('even', '==', false)
      const deleted = await db.deleteByQuery(q)
      expect(deleted).toBe(items.filter(item => !item.even).length)

      expect(await db.runQueryCount(queryAll())).toBe(1)
    })
  }

  // BUFFER
  if (support.bufferValues) {
    it('should save and load Buffer values', async () => {
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

    it('should commit the saves and deletes made in runInTransaction', async () => {
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
      expectMatch(
        expected,
        _sortBy(rows, r => r.id),
        quirks,
      )
    })

    it('should commit the saves and deletes made in a created transaction', async () => {
      // cleanup
      await db.deleteByQuery(queryAll())

      const tx = await db.createTransaction()
      await tx.saveBatch(TEST_TABLE, items)
      await tx.saveBatch(TEST_TABLE, [{ ...items[2]!, k1: 'k1_mod' }])
      await tx.deleteByIds(TEST_TABLE, [items[1]!.id])
      await tx.commit()

      const { rows } = await db.runQuery(queryAll())
      const expected = [items[0], { ...items[2]!, k1: 'k1_mod' }]
      expectMatch(
        expected,
        _sortBy(rows, r => r.id),
        quirks,
      )
    })

    it('should roll back runInTransaction when an operation fails', async () => {
      const expected = await prepare()

      let err: any

      try {
        await db.runInTransaction(async tx => {
          await tx.deleteByIds(TEST_TABLE, [items[2]!.id])
          // It should fail on id == null
          await tx.saveBatch(TEST_TABLE, [{ ...items[0]!, k1: 5, id: null as any }])
        })
      } catch (err2) {
        err = err2
      }

      expect(err).toBeDefined()

      const { rows } = await db.runQuery(queryAll())
      expectMatch(
        expected,
        _sortBy(rows, r => r.id),
        quirks,
      )
    })
  }

  if (support.patchByQuery) {
    it('should patch the rows matching a query', async () => {
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
      expectMatch(
        expected,
        _sortBy(rows, r => r.id),
        quirks,
      )
    })
  }

  if (support.increment) {
    it('should increment a property by a different amount per id', async () => {
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
      expectMatch(
        expected,
        _sortBy(rows, r => r.id),
        quirks,
      )
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
