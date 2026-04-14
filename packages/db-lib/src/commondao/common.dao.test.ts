import { randomBytes } from 'node:crypto'
import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { _range, _sortBy } from '@naturalcycles/js-lib/array'
import { ErrorMode, pExpectedError, pExpectedErrorString, pTry } from '@naturalcycles/js-lib/error'
import { _deepFreeze, _omit } from '@naturalcycles/js-lib/object'
import type { BaseDBEntity, UnixTimestamp, Unsaved } from '@naturalcycles/js-lib/types'
import { AjvValidationError } from '@naturalcycles/nodejs-lib/ajv'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { InMemoryDB } from '../inmemory/inMemory.db.js'
import type { TestItemBM, TestItemDBM } from '../testing/index.js'
import {
  createTestItemBM,
  createTestItemsBM,
  TEST_TABLE,
  testItemBMSchema,
} from '../testing/index.js'
import { TEST_TABLE_2 } from '../testing/test.model.js'
import { CommonDao } from './common.dao.js'
import type { CommonDaoCfg, CommonDaoOptions } from './common.dao.model.js'

let throwError = false

const db = new InMemoryDB()
const daoCfg: CommonDaoCfg<TestItemBM, TestItemDBM> = {
  table: TEST_TABLE,
  db,
  validateBM: testItemBMSchema.getValidationFunction(),
  hooks: {
    parseNaturalId: id => {
      if (throwError && id === 'id3') throw new Error('error_from_parseNaturalId')

      return {}
    },
    beforeDBMToBM: dbm => {
      // if(throwError && dbm.id === 'id4') throw new Error('error_from_beforeDBMToBM')

      return {
        ...dbm,
      }
    },
  },
}
const dao = new CommonDao(daoCfg)
const dao2 = new CommonDao({
  ...daoCfg,
  table: TEST_TABLE_2,
})

beforeEach(async () => {
  vi.setSystemTime(MOCK_TS_2018_06_21 * 1000)
  await db.resetCache()
})

afterEach(() => {
  vi.useRealTimers()
})

test('common', async () => {
  // This also tests type overloads (infers `null` if input is undefined)
  // expect(await dao.getById()).toBeNull() // illegal
  expect(await dao.getById(undefined)).toBeNull()
  expect(await dao.getById('non-existing')).toBeNull()
  expect(await dao.getByIdAsDBM(undefined)).toBeNull()
  expect(await dao.getByIdAsDBM('123')).toBeNull()

  expect(await dao.deleteById(undefined)).toBe(0)
  expect(await dao.deleteById('123')).toBe(0)
  expect(await dao.deleteByQuery(dao.query())).toBe(0)
  expect(await dao.deleteByQuery(dao.query(), { chunkSize: 500 })).toBe(0)

  expect(dao.anyToDBM(undefined)).toBeNull()
  expect(dao.anyToDBM({}, { skipValidation: true })).toMatchObject({})
})

test('multiGet', async () => {
  const { testItems1, testItems2 } = await CommonDao.multiGet({
    testItems1: dao.withIds(['id1', 'id2', 'id3']),
    testItems2: dao2.withIds(['id2', 'id4']),
  })
  expect(testItems1).toEqual([])
  expect(testItems2).toEqual([])

  const { item1, item2 } = await CommonDao.multiGet({
    item1: dao.withId('id1'),
    item2: dao2.withId('id2'), // this can be another Dao
  })
  expect(item1).toBeNull()
  expect(item2).toBeNull()

  await CommonDao.multiDelete([dao.withIds(['id1', 'id2', 'id3']), dao2.withId('id4')])

  const items1 = createTestItemsBM(20)
  const items2 = createTestItemsBM(10)
  await CommonDao.multiSave([
    dao.withRowsToSave(items1),
    dao2.withRowsToSave(items2),
    dao2.withRowToSave(items2[0]!, {
      skipIfEquals: items2[1]!,
    }),
  ])

  const result = await CommonDao.multiGet({
    item11: dao.withId('id1'),
    itemNotFound: dao.withId('id1abc'),
    item21: dao2.withId('id1'),
    items2: dao2.withIds(['id2', 'id1']),
  })
  // Length should be 2, not 3, since other prop (item21) should not affect it
  expect(result.items2).toHaveLength(2)
  expect(result).toMatchInlineSnapshot(`
    {
      "item11": {
        "created": 1529539200,
        "even": false,
        "id": "id1",
        "k1": "v1",
        "k2": "v2",
        "k3": 1,
        "nested": {
          "foo": 1,
        },
        "updated": 1529539200,
      },
      "item21": {
        "created": 1529539200,
        "even": false,
        "id": "id1",
        "k1": "v1",
        "k2": "v2",
        "k3": 1,
        "nested": {
          "foo": 1,
        },
        "updated": 1529539200,
      },
      "itemNotFound": null,
      "items2": [
        {
          "created": 1529539200,
          "even": true,
          "id": "id2",
          "k1": "v2",
          "k2": "v4",
          "k3": 2,
          "nested": {
            "foo": 2,
          },
          "updated": 1529539200,
        },
        {
          "created": 1529539200,
          "even": false,
          "id": "id1",
          "k1": "v1",
          "k2": "v2",
          "k3": 1,
          "nested": {
            "foo": 1,
          },
          "updated": 1529539200,
        },
      ],
    }
  `)
})

test('runUnionQuery', async () => {
  const items = createTestItemsBM(5)
  await dao.saveBatch(items)

  const items2 = await dao.runUnionQueries([
    dao.query().filterEq('even', true),
    dao.query().filterEq('even', false),
    dao.query().filterEq('even', false), // again, to test uniqueness
  ])

  expect(_sortBy(items2, r => r.id)).toEqual(items)
})

test('should propagate pipe errors', async () => {
  const items = createTestItemsBM(20)

  await dao.saveBatch(items, {
    preserveUpdated: true,
  })

  throwError = true

  const opt: CommonDaoOptions = {
    // logEvery: 1,
  }

  // default: Suppress errors
  let results: any[] = []
  await dao
    .query()
    .streamQuery(opt)
    .forEachSync(r => void results.push(r))
  // console.log(results)
  _sortBy(results, r => r.k3, { mutate: true })
  expect(results).toEqual(items.filter(i => i.id !== 'id3'))

  // Suppress errors
  results = []
  await dao
    .query()
    .streamQuery({
      ...opt,
      errorMode: ErrorMode.SUPPRESS,
    })
    .forEachSync(r => void results.push(r))
  _sortBy(results, r => r.k3, { mutate: true })
  expect(results).toEqual(items.filter(i => i.id !== 'id3'))

  // THROW_IMMEDIATELY
  const results2: any[] = []
  await expect(
    dao
      .query()
      .streamQuery({
        ...opt,
        errorMode: ErrorMode.THROW_IMMEDIATELY,
      })
      .forEachSync(r => void results2.push(r)),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: error_from_parseNaturalId]`)

  // Throws on 3rd element, all previous elements should be collected
  // Cannot expect it cause with async dbmToBM it uses async `transformMap`, so
  // the execution is not sequential
  // expect(results2).toEqual(items.slice(0, 2))

  // THROW_AGGREGATED
  results = []
  await expect(
    dao
      .query()
      .streamQuery({
        ...opt,
        errorMode: ErrorMode.THROW_AGGREGATED,
      })
      .forEachSync(r => void results.push(r)),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[AggregateError: transformMapSync resulted in 1 error(s)]`,
  )
  _sortBy(results, r => r.k3, { mutate: true })
  expect(results).toEqual(items.filter(i => i.id !== 'id3'))

  // .stream should suppress by default
  results = await dao.query().streamQuery(opt).toArray()
  _sortBy(results, r => r.k3, { mutate: true })
  expect(results).toEqual(items.filter(i => i.id !== 'id3'))
})

test('patchById', async () => {
  const id = '123456'
  const testItem: TestItemBM = {
    id,
    k1: 'k1',
    created: 1529539200 as UnixTimestamp,
    updated: 1529539200 as UnixTimestamp,
  }
  await dao.save(testItem)

  const r = await dao.patchById(id, {
    k1: 'k111',
  })

  const r2 = await dao.getById(id)
  expect(r.id).toBe(id)
  expect(r2).toEqual(r)
  expect(r).toMatchInlineSnapshot(`
    {
      "created": 1529539200,
      "id": "123456",
      "k1": "k111",
      "updated": 1529539200,
    }
  `)
})

test('patchById createIfMissing false', async () => {
  const id = '123456'
  expect(
    await pExpectedErrorString(
      dao.patchById(
        id,
        {
          k1: 'k111',
        },
        {
          createIfMissing: false,
        },
      ),
    ),
  ).toMatchInlineSnapshot(`"AssertionError: DB row required, but not found in TEST_TABLE"`)
})

describe('patch', () => {
  test('should patch when the data exists', async () => {
    const testItem: TestItemBM = {
      id: 'id1',
      k1: 'k1',
      created: 1529539200 as UnixTimestamp,
      updated: 1529539200 as UnixTimestamp,
    }
    await dao.save(testItem)

    await dao.patch(testItem, {
      k1: 'k111',
    })

    const updatedTestItem = await dao.requireById('id1')
    expect(updatedTestItem).toMatchObject({ k1: 'k111' })
  })

  test('should throw when the data does not exist', async () => {
    const testItem: TestItemBM = {
      id: 'id1',
      k1: 'k1',
      created: 1529539200 as UnixTimestamp,
      updated: 1529539200 as UnixTimestamp,
    }

    const error = await pExpectedErrorString(
      dao.patch(testItem, {
        k1: 'k111',
      }),
    )

    expect(error).toBe(`AssertionError: DB row required, but not found in TEST_TABLE`)
  })

  test('should create the data when it does not exist and `skipDBRead` is specified', async () => {
    const testItem: TestItemBM = {
      id: 'id1',
      k1: 'k1',
      created: 1529539200 as UnixTimestamp,
      updated: 1529539200 as UnixTimestamp,
    }

    await dao.patch(
      testItem,
      {
        k1: 'k111',
      },
      {
        skipDBRead: true,
      },
    )

    const updatedTestItem = await dao.requireById('id1')
    expect(updatedTestItem).toMatchObject({ k1: 'k111' })
  })
})

test('patch', async () => {
  const item: TestItemBM = await dao.save({
    id: 'id1',
    k1: 'k1',
  })

  // Something changes the item in a different process
  await dao.save({
    ...item,
    k1: 'k2',
  })

  // item.k1 is still the same in this process
  expect(item.k1).toBe('k1')

  // We want to set item.k3 to 1
  // Old-school careless way would be to just `item.k3 = 1` and save.
  // But that would overwrite the `k1 = k2` change above.
  // Instead, we apply a patch!
  // Then we inspect item, and it should reflect the `k1 = k2` change.
  const patchResult = await dao.patch(item, { k3: 5 })

  // It tracks the same object
  expect(patchResult).toBe(item)
  expect(item.k3).toBe(5) // patch is applied
  expect(item.k1).toBe('k2') // it pulled the change from DB (saved in the separate process)
  expect(item).toMatchInlineSnapshot(`
    {
      "created": 1529539200,
      "id": "id1",
      "k1": "k2",
      "k3": 5,
      "updated": 1529539200,
    }
  `)
})

test('patch cyclerStatus-like', async () => {
  const item: TestItemBM = await dao.save({
    id: 'id1',
    k1: 'k1',
  })

  // We mutate it, but it wasn't yet saved to DB
  item.k1 = 'k2'

  // Now we gonna call `patch`
  // It should compare item+patch with loaded (not loaded+patch with item!), and still do save
  await dao.patch(item, { k1: 'k2' })
  const loaded = await dao.requireById('id1')
  expect(loaded.k1).toBe('k2')
})

test('patch where item is stale', async () => {
  const item: TestItemBM = await dao.save({
    id: 'id1',
    k1: 'k1',
  })

  // Some external process saves k2 (different property, which was undefined)
  await dao.save({
    ...item,
    k2: 'k2',
  })

  // item stays as before
  expect(item.k2).toBeUndefined()

  // The patch should succeed, but item should be patched with k2=k2
  await dao.patch(item, { k1: 'k2' })
  expect(item.k2).toBe('k2')
  const loaded = await dao.requireById('id1')
  expect(loaded).toMatchObject({
    k1: 'k2',
    k2: 'k2',
  })
})

// todo: fix jest mock
// test.skip('ensureUniqueId', async () => {
//   const opt: CommonDaoSaveBatchOptions<TestItemBM> = {
//     ensureUniqueId: true,
//   }
//
//   // Will be autogenerated (both items)
//   const [item1, item2, item3] = createTestItemsBM(3).map(r => _omit(r, ['id']))
//   const item1Saved = await dao.save(item1!, opt)
//   const { id: id1 } = item1Saved
//
//   const _item2Saved = await dao.save(item2!, opt)
//   // const { id: id2 } = item2Saved
//
//   // Saving existing is fine
//   await dao.save(item1!, opt)
//
//   // Mock generator to make it generate same id as id1
//   vi.spyOn(require('@naturalcycles/nodejs-lib'), 'stringId').mockImplementationOnce(() => {
//     return id1
//   })
//
//   // verify mocking works
//   // expect(stringId()).toBe(id1)
//
//   // Save with same id should throw now!
//   await expect(dao.save(item3!, opt)).rejects.toThrow(DBLibError.NON_UNIQUE_ID)
//
//   // Emulate "retry" - should work now, cause mock only runs once
//   await dao.save(item3!, opt)
// })

test('modifications of immutable objects', async () => {
  const immutableDao = new CommonDao({ ...daoCfg, immutable: true })

  // Will be autogenerated (both items)
  const [item1, item2, item3] = createTestItemsBM(3).map(r => _omit(r, ['id']))
  const item1Saved = await immutableDao.save(item1!)

  item1Saved.k1 = 'modifiedk1'
  // Ensure object cannot be modified with save
  await expect(immutableDao.save(item1Saved)).rejects.toThrow(`INSERT failed, entity exists`)

  // Ensure objects be saved with saveBatch
  const bms = [item2!, item3!]

  await expect(immutableDao.saveBatch(bms)).resolves.not.toThrow()

  // Ensure Object can't be patched
  await expect(immutableDao.patchById(item1Saved.id, { k2: 'patchedk2' })).rejects.toThrow(
    `entity exists`,
  )

  // Ensure object can't be deleted
  await expect(immutableDao.deleteById(item1Saved.id)).rejects.toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: OBJECT_IS_IMMUTABLE]`,
  )
  await expect(
    immutableDao.deleteByIds([item1Saved.id]),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[AssertionError: OBJECT_IS_IMMUTABLE]`)
  const q = immutableDao.query().filter('id', '==', item1Saved.id)
  await expect(immutableDao.deleteByQuery(q)).rejects.toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: OBJECT_IS_IMMUTABLE]`,
  )

  // Ensure deletion is possible with override flag
  await expect(immutableDao.deleteByQuery(q, { allowMutability: true })).resolves.not.toThrow()
  await expect(
    immutableDao.deleteById(item1Saved.id, { allowMutability: true }),
  ).resolves.not.toThrow()
  await expect(
    immutableDao.deleteByIds([item1Saved.id], { allowMutability: true }),
  ).resolves.not.toThrow()
})

test('ensure mutable objects can be written to multiple times', async () => {
  const [item1] = createTestItemsBM(1).map(r => _omit(r, ['id']))
  const item1Saved = await dao.save(item1!)

  item1Saved.k1 = 'modifiedk1'
  // Ensure object cannot be modified with save
  await expect(dao.save(item1Saved)).resolves.not.toThrow()
})

test('mutation', async () => {
  const obj = {
    id: '123',
    k1: 'k1',
    k2: null,
  }

  const saved = await dao.save(obj)

  // Should return the original object
  expect(obj === saved).toBe(true)

  // But `created`, `updated` should be "mutated" on the original object
  expect((obj as any).created).toBe(MOCK_TS_2018_06_21)
})

test('validateAndConvert does not mutate and returns new reference', async () => {
  const bm = createTestItemBM()
  _deepFreeze(bm)

  const bm2 = (dao as any).validateAndConvert(bm)
  expect(bm === bm2).toBe(false)
})

test('should pass `mutateInput` option to the validateBM method', async () => {
  const dao = new CommonDao<TestItemBM>({
    table: TEST_TABLE,
    db,
    validateBM: (bm, opt) => {
      expect(opt?.mutateInput).toBe(true)
      return [null, bm as TestItemBM]
    },
  })

  await dao.save(
    {
      k1: 'sdf',
    },
    { mutateInput: true },
  )
})

test('should preserve null on load and save', async () => {
  const r = await dao.save({
    id: '123',
    k1: 'k1',
    k2: null,
  })

  // console.log(r)

  // r is mutated with created/updated properties, but null values are intact
  expect(r).toEqual({
    id: '123',
    k1: 'k1',
    k2: null,
    created: MOCK_TS_2018_06_21,
    updated: MOCK_TS_2018_06_21,
  })

  const r2 = await dao.requireById('123')
  // console.log(r2)

  expect(r2).toEqual({
    id: '123',
    k1: 'k1',
    k2: null,
    created: MOCK_TS_2018_06_21,
    updated: MOCK_TS_2018_06_21,
  })
})

test('does not reset updated on getByIdAsDBM', async () => {
  const r = await dao.save({
    id: '123',
    k1: 'k1',
    k2: null,
  })
  const updated1 = r.updated
  // console.log(r.updated)

  // 5 seconds later
  const newNow = (MOCK_TS_2018_06_21 + 5000) as UnixTimestamp
  vi.setSystemTime(newNow * 1000)

  const bm = await dao.requireById(r.id)
  // console.log(bm.updated)
  expect(bm.updated).toBe(updated1) // unchanged

  const dbm = await dao.requireByIdAsDBM(r.id)
  // console.log(bm.updated)
  expect(dbm.updated).toBe(updated1) // unchanged

  const r2 = await dao.save(r)
  expect(r2.created).toBe(updated1)
  expect(r2.updated).toBe(newNow) // updated!

  const [r2b] = await dao.saveBatch([r])
  expect(r2b!.created).toBe(updated1)
  expect(r2b!.updated).toBe(newNow) // updated!

  const r3 = await dao.saveAsDBM(r)
  expect(r3.created).toBe(updated1)
  expect(r3.updated).toBe(newNow) // updated!

  const [r3b] = await dao.saveBatchAsDBM([r])
  expect(r3b!.created).toBe(updated1)
  expect(r3b!.updated).toBe(newNow) // updated!
})

test('ajvSchema', async () => {
  const dao = new CommonDao({
    table: TEST_TABLE,
    db,
    validateBM: testItemBMSchema.getValidationFunction(),
  })

  const items = createTestItemsBM(3)

  // Should pass validation
  await dao.saveBatch(items)
  await dao.save({
    k1: 'sdf',
  })

  // This should fail
  const [err] = await pTry(
    dao.save({
      id: 'id123', // provided, so we can snapshot-match
      k1: 5 as any,
    }),
    AjvValidationError,
  )
  expect(err).toBeInstanceOf(AjvValidationError)
  expect(err).toMatchInlineSnapshot(`
[AjvValidationError: TEST_TABLE.id123.k1 must be string
Input: { id: 'id123', k1: 5, created: 1529539200, updated: 1529539200 }]
`)

  console.log((err as any).data)
})

interface Item extends BaseDBEntity {
  id: string
  obj: any
  shu?: string
}

test('json parsing/stringifying via hook', async () => {
  const dao = new CommonDao<Item>({
    table: TEST_TABLE,
    db,
    hooks: {
      beforeBMToDBM(bm) {
        return {
          ...bm,
          obj: JSON.stringify(bm.obj),
        }
      },
      beforeDBMToBM(dbm) {
        return {
          ...dbm,
          obj: JSON.parse(dbm.obj),
        }
      },
    },
  })

  const items = _range(3).map(n => ({
    id: `id${n}`,
    obj: {
      objId: `objId${n}`,
    },
  }))

  await dao.saveBatch(items)

  const items2 = await dao.getByIds(items.map(item => item.id))
  expect(items2).toEqual(items)
})

test('runQuery stack', async () => {
  // save invalid value
  await dao.save(
    {
      id: 'invalid',
      even: true,
    } as TestItemBM,
    { skipValidation: true },
  )

  const err = await pExpectedError(getEven())
  // expect(err.stack).toContain('at getEven (') // todo: fix me!
  expect(err.stack).toBeDefined() // todo: fix me!
})

async function getEven(): Promise<TestItemBM[]> {
  return await dao.query().filterEq('even', true).runQuery()
}

test('runInTransaction', async () => {
  const items = createTestItemsBM(4)

  await dao.runInTransaction(async tx => {
    await tx.save(dao, items[0]!)
    await tx.save(dao, items[1]!)
    await tx.save(dao, items[3]!)
    await tx.deleteById(dao, items[1]!.id)
  })

  const items2 = await dao.query().runQuery()
  expect(items2.map(i => i.id).sort()).toEqual(['id1', 'id4'])
})

test('should not be able to query by a non-indexed property', async () => {
  const db = new InMemoryDB()
  const dao = new CommonDao<TestItemBM>({
    table: TEST_TABLE,
    db,
    excludeFromIndexes: ['k1'],
  })

  await dao.saveBatch(createTestItemsBM(5))

  expect(await dao.query().filterEq('k2', 'v2').runQueryCount()).toBe(1)
  expect(await dao.query().filterEq('k2', 'v-non-existing').runQueryCount()).toBe(0)

  await expect(
    dao.query().filterEq('k1', 'v1').runQueryCount(),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: cannot query on non-indexed property: TEST_TABLE.k1]`,
  )
})

describe('auto compression', () => {
  test('should work', async () => {
    const dao = new CommonDao<Item>({
      table: TEST_TABLE,
      db,
      compress: {
        keys: ['obj', 'shu'],
      },
      hooks: {
        beforeBMToDBM(bm) {
          expect(bm).not.toHaveProperty('__compressed')
          return bm
        },
        beforeDBMToBM(dbm) {
          // After decompression, the __compressed property is set to undefined (not deleted for performance)
          expect(dbm).toHaveProperty('__compressed')
          expect((dbm as any)['__compressed']).toBeUndefined()
          return dbm
        },
      },
    })

    const items = _range(3).map(n => ({
      id: `id${n}`,
      obj: {
        objId: `objId${n}`,
      },
      shu: `shu${n}`,
    }))

    await dao.saveBatch(items)

    const items2 = await dao.getByIds(items.map(item => item.id))
    expect(items2).toEqual(items)

    const { data } = dao.cfg.db as InMemoryDB
    expect(data[TEST_TABLE]).toEqual({
      // Only the compressed property exists, the original properties don't
      id0: {
        created: 1529539200,
        __compressed: expect.any(Buffer),
        id: 'id0',
        updated: 1529539200,
      },
      id1: {
        created: 1529539200,
        __compressed: expect.any(Buffer),
        id: 'id1',
        updated: 1529539200,
      },
      id2: {
        created: 1529539200,
        __compressed: expect.any(Buffer),
        id: 'id2',
        updated: 1529539200,
      },
    })
  })

  test('saveAsDBM(readAsDBM()) round-trip should work', async () => {
    const dao = new CommonDao<Item>({
      table: TEST_TABLE,
      db,
      compress: {
        keys: ['obj', 'shu'],
      },
    })

    const item = {
      id: 'id1',
      obj: { objId: 'objId1' },
      shu: 'shu1',
    }

    // Save via normal save
    await dao.save(item)

    // Read as DBM (should be decompressed)
    const dbm = await dao.getByIdAsDBM('id1')
    expect(dbm).toMatchObject({
      id: 'id1',
      obj: { objId: 'objId1' },
      shu: 'shu1',
    })
    // After decompression, __compressed property is set to undefined (not deleted for performance)
    expect((dbm as any).__compressed).toBeUndefined()

    // Modify and save as DBM (should compress before saving)
    dbm!.shu = 'shu1-modified'
    await dao.saveAsDBM(dbm!)

    // Read back and verify
    const result = await dao.getById('id1')
    expect(result).toMatchObject({
      id: 'id1',
      obj: { objId: 'objId1' },
      shu: 'shu1-modified',
    })

    // Verify storage is compressed
    const { data } = dao.cfg.db as InMemoryDB
    expect(data[TEST_TABLE]!['id1']).toEqual({
      created: expect.any(Number),
      __compressed: expect.any(Buffer),
      id: 'id1',
      updated: expect.any(Number),
    })
  })

  describe('all read/write APIs should handle compression correctly', () => {
    function createDao(): CommonDao<Item> {
      return new CommonDao<Item>({
        table: TEST_TABLE,
        db,
        compress: {
          keys: ['obj', 'shu'],
        },
      })
    }

    function createItem(n: number): Unsaved<Item> {
      return {
        id: `id${n}`,
        obj: { objId: `objId${n}` },
        shu: `shu${n}`,
      }
    }

    function expectDecompressed(item: any, n: number): void {
      expect(item).toMatchObject({
        id: `id${n}`,
        obj: { objId: `objId${n}` },
        shu: `shu${n}`,
      })
      // After decompression, __compressed property is set to undefined (not deleted for performance)
      expect(item.__compressed).toBeUndefined()
    }

    function expectStorageCompressed(dao: CommonDao<Item>, id: string): void {
      const { data } = dao.cfg.db as InMemoryDB
      expect(data[TEST_TABLE]![id]).toEqual({
        created: expect.any(Number),
        __compressed: expect.any(Buffer),
        id,
        updated: expect.any(Number),
      })
    }

    // Write APIs
    test('save', async () => {
      const dao = createDao()
      const item = createItem(1)
      await dao.save(item)
      expectStorageCompressed(dao, 'id1')
    })

    test('saveAsDBM', async () => {
      const dao = createDao()
      await dao.saveAsDBM(createItem(1) as any)
      expectStorageCompressed(dao, 'id1')
    })

    test('saveBatch', async () => {
      const dao = createDao()
      await dao.saveBatch([createItem(1), createItem(2)])
      expectStorageCompressed(dao, 'id1')
      expectStorageCompressed(dao, 'id2')
    })

    test('saveBatchAsDBM', async () => {
      const dao = createDao()
      await dao.saveBatchAsDBM([createItem(1), createItem(2)] as any)
      expectStorageCompressed(dao, 'id1')
      expectStorageCompressed(dao, 'id2')
    })

    test('patchById', async () => {
      const dao = createDao()
      await dao.save(createItem(1))
      await dao.patchById('id1', { shu: 'shu1-patched' })
      expectStorageCompressed(dao, 'id1')
      const result = await dao.getById('id1')
      expect(result!.shu).toBe('shu1-patched')
    })

    // Read APIs
    test('getById', async () => {
      const dao = createDao()
      await dao.save(createItem(1))
      const result = await dao.getById('id1')
      expectDecompressed(result, 1)
    })

    test('getByIdAsDBM', async () => {
      const dao = createDao()
      await dao.save(createItem(1))
      const result = await dao.getByIdAsDBM('id1')
      expectDecompressed(result, 1)
    })

    test('getByIds', async () => {
      const dao = createDao()
      await dao.saveBatch([createItem(1), createItem(2)])
      const results = await dao.getByIds(['id1', 'id2'])
      expect(results).toHaveLength(2)
      const sorted = _sortBy(results, r => r.id)
      expectDecompressed(sorted[0], 1)
      expectDecompressed(sorted[1], 2)
    })

    test('getByIdsAsDBM', async () => {
      const dao = createDao()
      await dao.saveBatch([createItem(1), createItem(2)])
      const results = await dao.getByIdsAsDBM(['id1', 'id2'])
      expect(results).toHaveLength(2)
      const sorted = _sortBy(results, r => r.id)
      expectDecompressed(sorted[0], 1)
      expectDecompressed(sorted[1], 2)
    })

    test('requireById', async () => {
      const dao = createDao()
      await dao.save(createItem(1))
      const result = await dao.requireById('id1')
      expectDecompressed(result, 1)
    })

    test('requireByIdAsDBM', async () => {
      const dao = createDao()
      await dao.save(createItem(1))
      const result = await dao.requireByIdAsDBM('id1')
      expectDecompressed(result, 1)
    })

    test('getAll', async () => {
      const dao = createDao()
      await dao.saveBatch([createItem(1), createItem(2)])
      const results = await dao.getAll()
      expect(results).toHaveLength(2)
      const sorted = _sortBy(results, r => r.id)
      expectDecompressed(sorted[0], 1)
      expectDecompressed(sorted[1], 2)
    })

    test('runQuery', async () => {
      const dao = createDao()
      await dao.saveBatch([createItem(1), createItem(2)])
      const results = await dao.runQuery(dao.query())
      expect(results).toHaveLength(2)
      const sorted = _sortBy(results, r => r.id)
      expectDecompressed(sorted[0], 1)
      expectDecompressed(sorted[1], 2)
    })

    test('runQueryAsDBM', async () => {
      const dao = createDao()
      await dao.saveBatch([createItem(1), createItem(2)])
      const results = await dao.runQueryAsDBM(dao.query())
      expect(results).toHaveLength(2)
      const sorted = _sortBy(results, r => r.id)
      expectDecompressed(sorted[0], 1)
      expectDecompressed(sorted[1], 2)
    })

    test('runQueryExtended', async () => {
      const dao = createDao()
      await dao.saveBatch([createItem(1), createItem(2)])
      const { rows } = await dao.runQueryExtended(dao.query())
      expect(rows).toHaveLength(2)
      const sorted = _sortBy(rows, r => r.id)
      expectDecompressed(sorted[0], 1)
      expectDecompressed(sorted[1], 2)
    })

    test('runQueryExtendedAsDBM', async () => {
      const dao = createDao()
      await dao.saveBatch([createItem(1), createItem(2)])
      const { rows } = await dao.runQueryExtendedAsDBM(dao.query())
      expect(rows).toHaveLength(2)
      const sorted = _sortBy(rows, r => r.id)
      expectDecompressed(sorted[0], 1)
      expectDecompressed(sorted[1], 2)
    })

    test('streamQuery', async () => {
      const dao = createDao()
      await dao.saveBatch([createItem(1), createItem(2)])
      const results = await dao.streamQuery(dao.query()).toArray()
      expect(results).toHaveLength(2)
      const sorted = _sortBy(results, r => r.id)
      expectDecompressed(sorted[0], 1)
      expectDecompressed(sorted[1], 2)
    })

    test('streamQueryAsDBM', async () => {
      const dao = createDao()
      await dao.saveBatch([createItem(1), createItem(2)])
      const results = await dao.streamQueryAsDBM(dao.query()).toArray()
      expect(results).toHaveLength(2)
      const sorted = _sortBy(results, r => r.id)
      expectDecompressed(sorted[0], 1)
      expectDecompressed(sorted[1], 2)
    })

    // Conversion APIs
    test('bmToDBM and dbmToBM', async () => {
      const dao = createDao()
      const item = createItem(1)
      const dbm = dao.bmToDBM(item as Item)
      // bmToDBM should NOT compress - DBM is the logical type
      expectDecompressed(dbm, 1)

      const bm = dao.dbmToBM(dbm)
      expectDecompressed(bm, 1)
    })

    // Static multiGet/multiSave
    test('multiSave and multiGet', async () => {
      const dao = createDao()

      await CommonDao.multiSave([dao.withRowsToSave([createItem(1), createItem(2)])])

      // Verify storage is compressed
      expectStorageCompressed(dao, 'id1')
      expectStorageCompressed(dao, 'id2')

      // multiGet should decompress
      const result = await CommonDao.multiGet({
        items: dao.withIds(['id1', 'id2']),
      })
      expect(result.items).toHaveLength(2)
      const sorted = _sortBy(result.items, r => r.id)
      expectDecompressed(sorted[0], 1)
      expectDecompressed(sorted[1], 2)
    })

    // Public storage conversion API (for direct DB access)
    test('dbmToStorageRow compresses DBM', async () => {
      const dao = createDao()
      const item = createItem(1) as Item
      dao.assignIdCreatedUpdated(item)
      const dbm = dao.bmToDBM(item)

      const storageRow = (await dao.dbmToStorageRow(dbm)) as any
      expect(storageRow.id).toBe('id1')
      expect(storageRow.__compressed).toBeInstanceOf(Buffer)
      expect(storageRow.obj).toBeUndefined()
      expect(storageRow.shu).toBeUndefined()
    })

    test('storageRowToDBM decompresses storage row', async () => {
      const dao = createDao()
      const item = createItem(1) as Item
      dao.assignIdCreatedUpdated(item)
      const dbm = dao.bmToDBM(item)
      const storageRow = await dao.dbmToStorageRow(dbm)

      const restored = dao.storageRowToDBM(storageRow)
      expectDecompressed(restored, 1)
    })

    test('dbmToStorageRow and storageRowToDBM round-trip', async () => {
      const dao = createDao()
      const item = createItem(1) as Item
      dao.assignIdCreatedUpdated(item)
      const dbm = dao.bmToDBM(item)

      // Round-trip: DBM -> storage -> DBM
      const storageRow = await dao.dbmToStorageRow(dbm)
      const restored = dao.storageRowToDBM(storageRow)

      expect(restored).toMatchObject({
        id: dbm.id,
        obj: dbm.obj,
        shu: dbm.shu,
      })
    })

    test('direct DB write with dbmToStorageRow', async () => {
      const dao = createDao()
      const item = createItem(1) as Item
      dao.assignIdCreatedUpdated(item)
      const dbm = dao.bmToDBM(item)

      // Write directly to DB using storage row
      const storageRow = await dao.dbmToStorageRow(dbm)
      await db.saveBatch(TEST_TABLE, [storageRow] as any[])

      // Verify storage is compressed
      expectStorageCompressed(dao, 'id1')

      // Read through DAO should decompress
      const result = await dao.getById('id1')
      expectDecompressed(result, 1)
    })
  })

  test('should be possible to opt-in without migration', async () => {
    const daoWithoutCompression = new CommonDao<Item>({
      table: TEST_TABLE,
      db,
    })

    const items1 = _range(2).map(n => ({
      id: `id${n}`,
      obj: {
        objId: `objId${n}`,
      },
      shu: `shu${n}`,
    }))

    await daoWithoutCompression.saveBatch(items1)

    const daoWithCompression = new CommonDao<Item>({
      table: TEST_TABLE,
      db,
      compress: {
        keys: ['obj', 'shu'],
      },
    })

    // Should still be able to fetch non-compressed data properly
    const fetchedItems1 = await daoWithCompression.getAll()
    expect(fetchedItems1).toMatchInlineSnapshot(`
      [
        {
          "created": 1529539200,
          "id": "id0",
          "obj": {
            "objId": "objId0",
          },
          "shu": "shu0",
          "updated": 1529539200,
        },
        {
          "created": 1529539200,
          "id": "id1",
          "obj": {
            "objId": "objId1",
          },
          "shu": "shu1",
          "updated": 1529539200,
        },
      ]
    `)

    const items2 = _range(2, 4).map(n => ({
      id: `id${n}`,
      obj: {
        objId: `objId${n}`,
      },
      shu: `shu${n}`,
    }))

    await daoWithCompression.saveBatch(items2)

    // Should start compressing newly saved data
    const { data } = dao.cfg.db as InMemoryDB
    expect(data[TEST_TABLE]).toEqual({
      id0: {
        created: 1529539200,
        id: 'id0',
        obj: {
          objId: 'objId0',
        },
        shu: 'shu0',
        updated: 1529539200,
      },
      id1: {
        created: 1529539200,
        id: 'id1',
        obj: {
          objId: 'objId1',
        },
        shu: 'shu1',
        updated: 1529539200,
      },
      id2: {
        created: 1529539200,
        __compressed: expect.any(Buffer),
        id: 'id2',
        updated: 1529539200,
      },
      id3: {
        created: 1529539200,
        __compressed: expect.any(Buffer),
        id: 'id3',
        updated: 1529539200,
      },
    })
  })

  test('should automatically exclude data property from indexes', async () => {
    const dao = new CommonDao<Item>({
      table: TEST_TABLE,
      db,
      compress: {
        keys: ['obj', 'shu'],
      },
    })

    const saveBatchSpy = vi.spyOn(db, 'saveBatch')

    const items = _range(3).map(n => ({
      id: `id${n}`,
      obj: {
        objId: `objId${n}`,
      },
      shu: `shu${n}`,
    }))

    await dao.saveBatch(items)

    // The '__compressed' property should be automatically added to excludeFromIndexes
    // when compression is enabled
    expect(saveBatchSpy).toHaveBeenCalledWith(
      TEST_TABLE,
      expect.any(Array),
      expect.objectContaining({
        excludeFromIndexes: expect.arrayContaining(['__compressed']),
      }),
    )

    saveBatchSpy.mockRestore()
  })
})

describe('auto chunking', () => {
  // Small threshold so tests can trigger chunking with reasonable payload sizes.
  const SMALL_MAX = 128

  // Build a payload that compresses to more than N bytes. Uses random base64 so content
  // is incompressible; compressed length ≳ uncompressed length.
  function makeLargeObj(approxUncompressedBytes: number): any {
    const buf = randomBytes(approxUncompressedBytes)
    return { blob: buf.toString('base64') }
  }

  function newDao(chunkCfg: boolean | { maxChunkSize?: number } = { maxChunkSize: SMALL_MAX }): {
    dao: CommonDao<Item>
    db: InMemoryDB
  } {
    const localDb = new InMemoryDB()
    const dao = new CommonDao<Item>({
      table: TEST_TABLE,
      db: localDb,
      compress: {
        keys: ['obj'],
        chunk: chunkCfg,
      },
    })
    return { dao, db: localDb }
  }

  test('round-trip small entity saves as a single row', async () => {
    const { dao, db: localDb } = newDao()
    await dao.save({ id: 'abc', obj: { n: 1 } })

    const storage = localDb.data[TEST_TABLE]!
    expect(Object.keys(storage)).toEqual(['abc'])
    expect((storage['abc'] as any).__chunks).toBeUndefined()

    const back = await dao.getById('abc')
    expect(back).toEqual({
      id: 'abc',
      obj: { n: 1 },
      created: expect.any(Number),
      updated: expect.any(Number),
    })
  })

  test('round-trip large entity splits into N storage rows', async () => {
    const { dao, db: localDb } = newDao()
    const obj = makeLargeObj(SMALL_MAX * 4) // forces multiple chunks
    await dao.save({ id: 'big', obj })

    const storage = localDb.data[TEST_TABLE]!
    const ids = Object.keys(storage).sort()
    expect(ids.length).toBeGreaterThan(1)
    expect(ids[0]).toBe('big')
    expect((storage['big'] as any).__chunks).toBeGreaterThanOrEqual(2)
    // All overflow rows have __chunked: true and match the id pattern
    for (const id of ids.slice(1)) {
      expect(id).toMatch(/^big__c\d+$/)
      expect((storage[id] as any).__chunked).toBe(true)
    }

    const back = await dao.getById('big')
    expect(back?.obj).toEqual(obj)
  })

  test('orphan cleanup: shrinking chunk count deletes stale chunks', async () => {
    const { dao, db: localDb } = newDao()
    const big = makeLargeObj(SMALL_MAX * 5)
    await dao.save({ id: 'e1', obj: big })
    const initialN = (localDb.data[TEST_TABLE]!['e1'] as any).__chunks as number
    expect(initialN).toBeGreaterThanOrEqual(3)

    // Re-save with much smaller payload — should now fit in 1 row, old chunks should be gone
    await dao.save({ id: 'e1', obj: { n: 1 } })
    const ids = Object.keys(localDb.data[TEST_TABLE]!).sort()
    expect(ids).toEqual(['e1'])
    expect((localDb.data[TEST_TABLE]!['e1'] as any).__chunks).toBeUndefined()
  })

  test('orphan cleanup: N→M shrink where M > 1 deletes only stale chunks', async () => {
    const { dao, db: localDb } = newDao()
    const veryBig = makeLargeObj(SMALL_MAX * 6)
    await dao.save({ id: 'e2', obj: veryBig })
    const initialN = (localDb.data[TEST_TABLE]!['e2'] as any).__chunks as number
    expect(initialN).toBeGreaterThanOrEqual(4)

    // Re-save with a smaller-but-still-chunked payload
    const medBig = makeLargeObj(SMALL_MAX * 3)
    await dao.save({ id: 'e2', obj: medBig })
    const newN = (localDb.data[TEST_TABLE]!['e2'] as any).__chunks as number
    expect(newN).toBeGreaterThanOrEqual(2)
    expect(newN).toBeLessThan(initialN)

    // Only primary + newN-1 chunk rows remain; old chunks beyond newN are gone
    const ids = Object.keys(localDb.data[TEST_TABLE]!).sort()
    expect(ids).toHaveLength(newN) // primary + (newN - 1) chunks
    expect(ids[0]).toBe('e2')

    // Round-trip still works
    const back = await dao.getById('e2')
    expect(back?.obj).toEqual(medBig)
  })

  test('orphan cleanup uses PREV_CHUNKS symbol for exact range', async () => {
    const { dao, db: localDb } = newDao()
    const big = makeLargeObj(SMALL_MAX * 5)
    await dao.save({ id: 'sym', obj: big })
    const initialN = (localDb.data[TEST_TABLE]!['sym'] as any).__chunks as number
    expect(initialN).toBeGreaterThanOrEqual(3)

    // Read the entity — this stamps PREV_CHUNKS on the returned object
    const loaded = await dao.getById('sym')
    expect(loaded).toBeTruthy()

    // Spy on deleteByIds to verify exact orphan range
    const deleteSpy = vi.spyOn(localDb, 'deleteByIds')

    // Re-save with a small payload (1 chunk) — orphan cleanup should target exactly
    // indices initialN..initialN-1, not 1..99
    loaded!.obj = { n: 1 }
    await dao.save(loaded!)

    // The deleteByIds call for orphans should contain at most initialN - 1 ids (indices 1..initialN-1),
    // NOT 99 ids (indices 1..99)
    const orphanDeleteCall = deleteSpy.mock.calls.find(call =>
      call[1].some(id => id.startsWith('sym__c')),
    )
    expect(orphanDeleteCall).toBeDefined()
    const deletedChunkIds = orphanDeleteCall![1].filter(id => id.startsWith('sym__c'))
    expect(deletedChunkIds).toHaveLength(initialN - 1)

    deleteSpy.mockRestore()
  })

  test('deleteById removes all chunk rows', async () => {
    const { dao, db: localDb } = newDao()
    await dao.save({ id: 'del', obj: makeLargeObj(SMALL_MAX * 4) })
    const ids = Object.keys(localDb.data[TEST_TABLE]!)
    expect(ids.length).toBeGreaterThan(1)

    await dao.deleteById('del')
    expect(Object.keys(localDb.data[TEST_TABLE]!)).toEqual([])
  })

  test('runQuery filters out chunk rows', async () => {
    const { dao } = newDao()
    await dao.save({ id: 'one', obj: makeLargeObj(SMALL_MAX * 3) })
    await dao.save({ id: 'two', obj: { small: true } })

    const all = await dao.getAll()
    expect(all.map(r => r.id).sort()).toEqual(['one', 'two'])
    // Reassembly restored the full obj
    const byId = Object.fromEntries(all.map(r => [r.id, r]))
    expect(byId['one']!.obj).toEqual(expect.objectContaining({ blob: expect.any(String) }))
  })

  test('streamQuery filters and reassembles', async () => {
    const { dao } = newDao()
    await dao.save({ id: 's1', obj: makeLargeObj(SMALL_MAX * 3) })
    await dao.save({ id: 's2', obj: { small: true } })

    const results = await dao.streamQuery(dao.query()).toArray()
    expect(results.map(r => r.id).sort()).toEqual(['s1', 's2'])
    const byId = Object.fromEntries(results.map(r => [r.id, r]))
    expect(byId['s1']!.obj).toEqual(expect.objectContaining({ blob: expect.any(String) }))
  })

  test('partial query (select) still filters chunk rows', async () => {
    const { dao } = newDao()
    await dao.save({ id: 'p1', obj: makeLargeObj(SMALL_MAX * 3) })
    await dao.save({ id: 'p2', obj: { n: 1 } })

    const ids = await dao.queryIds(dao.query())
    expect(ids.sort()).toEqual(['p1', 'p2'])
  })

  test('queryIds and streamQueryIds exclude chunk ids', async () => {
    const { dao } = newDao()
    await dao.save({ id: 'q1', obj: makeLargeObj(SMALL_MAX * 3) })

    const ids = await dao.queryIds(dao.query())
    expect(ids).toEqual(['q1'])

    const streamedIds = await dao.streamQueryIds(dao.query()).toArray()
    expect(streamedIds).toEqual(['q1'])
  })

  test('getByIds mixed chunked + non-chunked', async () => {
    const { dao } = newDao()
    const big = makeLargeObj(SMALL_MAX * 3)
    await dao.save({ id: 'm1', obj: big })
    await dao.save({ id: 'm2', obj: { small: true } })

    const results = await dao.getByIds(['m1', 'm2'])
    expect(results.map(r => r.id).sort()).toEqual(['m1', 'm2'])
    const byId = Object.fromEntries(results.map(r => [r.id, r]))
    expect(byId['m1']!.obj).toEqual(big)
  })

  test('patchById on chunked entity re-chunks correctly', async () => {
    const { dao, db: localDb } = newDao()
    const initial = makeLargeObj(SMALL_MAX * 3)
    await dao.save({ id: 'p1', obj: initial })

    await dao.patchById('p1', { obj: { ...initial, extra: 'x' } })

    const back = await dao.getById('p1')
    expect(back?.obj).toEqual({ ...initial, extra: 'x' })
    // Storage should still have primary + chunks
    const ids = Object.keys(localDb.data[TEST_TABLE]!)
    expect(ids.length).toBeGreaterThan(1)
    expect(ids).toContain('p1')
  })

  test('patchByQuery throws when chunking enabled', async () => {
    const { dao } = newDao()
    await expect(dao.patchByQuery(dao.query(), { obj: { n: 2 } })).rejects.toThrow(
      /patchByQuery.*not supported/,
    )
  })

  test('patchByIds throws when chunking enabled', async () => {
    const { dao } = newDao()
    await expect(dao.patchByIds(['x'], { obj: { n: 2 } })).rejects.toThrow(
      /patchByQuery.*not supported/,
    )
  })

  test('runQueryCount throws on unfiltered query when chunking enabled', async () => {
    const { dao } = newDao()
    await expect(dao.query().runQueryCount()).rejects.toThrow(/requires at least one filter/)
  })

  test('runQueryCount works with a filter', async () => {
    const { dao } = newDao()
    await dao.save({ id: 'c1', obj: { n: 1 } })
    await dao.save({ id: 'c2', obj: { n: 2 } })

    const count = await dao.query().filterEq('id', 'c1').runQueryCount()
    expect(count).toBe(1)
  })

  test('entity id matching chunk pattern is rejected even for small entities', async () => {
    const { dao } = newDao()
    // Small entity that doesn't need chunking — but the id matches the reserved pattern
    await expect(dao.save({ id: 'bad__c1', obj: { n: 1 } })).rejects.toThrow(
      /reserved chunk-id pattern/,
    )
    // Large entity that does need chunking
    await expect(dao.save({ id: 'bad__c1', obj: makeLargeObj(SMALL_MAX * 3) })).rejects.toThrow(
      /reserved chunk-id pattern/,
    )
  })

  test('auto-adds __chunked and __chunks to excludeFromIndexes', async () => {
    const { dao, db: localDb } = newDao()
    const saveBatchSpy = vi.spyOn(localDb, 'saveBatch')

    await dao.save({ id: 'ei', obj: { n: 1 } })

    expect(saveBatchSpy).toHaveBeenCalledWith(
      TEST_TABLE,
      expect.any(Array),
      expect.objectContaining({
        excludeFromIndexes: expect.arrayContaining(['__compressed', '__chunked', '__chunks']),
      }),
    )
    saveBatchSpy.mockRestore()
  })

  test('deleteByQuery removes chunk rows', async () => {
    const { dao, db: localDb } = newDao()
    await dao.save({ id: 'dq1', obj: makeLargeObj(SMALL_MAX * 3) })
    await dao.save({ id: 'dq2', obj: { n: 1 } })

    const deleted = await dao.deleteByQuery(dao.query())
    expect(deleted).toBe(2)
    expect(Object.keys(localDb.data[TEST_TABLE] || {})).toEqual([])
  })

  test('saveBatch with mix of chunked and non-chunked entities', async () => {
    const { dao, db: localDb } = newDao()
    const big = makeLargeObj(SMALL_MAX * 3)
    await dao.saveBatch([
      { id: 'b1', obj: big },
      { id: 'b2', obj: { n: 1 } },
      { id: 'b3', obj: big },
    ])

    const results = await dao.getByIds(['b1', 'b2', 'b3'])
    expect(results.map(r => r.id).sort()).toEqual(['b1', 'b2', 'b3'])
    const byId = Object.fromEntries(results.map(r => [r.id, r]))
    expect(byId['b1']!.obj).toEqual(big)
    expect(byId['b3']!.obj).toEqual(big)
    expect(byId['b2']!.obj).toEqual({ n: 1 })

    // Storage should have at least 5 rows (3 primaries + chunks for 2 big ones)
    expect(Object.keys(localDb.data[TEST_TABLE]!).length).toBeGreaterThanOrEqual(5)
  })

  test('constructor rejects chunk without keys', () => {
    expect(
      () =>
        new CommonDao<Item>({
          table: TEST_TABLE,
          db,
          compress: { keys: [], chunk: true },
        }),
    ).toThrow(/compress\.chunk requires compress\.keys to be non-empty/)
  })
})
