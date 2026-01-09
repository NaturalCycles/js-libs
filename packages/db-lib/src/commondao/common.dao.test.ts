import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { _range, _sortBy } from '@naturalcycles/js-lib/array'
import { ErrorMode, pExpectedError, pExpectedErrorString, pTry } from '@naturalcycles/js-lib/error'
import { _deepFreeze, _omit } from '@naturalcycles/js-lib/object'
import type { BaseDBEntity, UnixTimestamp } from '@naturalcycles/js-lib/types'
import { AjvSchema, AjvValidationError } from '@naturalcycles/nodejs-lib/ajv'
import { deflateString, inflateToString } from '@naturalcycles/nodejs-lib/zip'
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
  validateBM: AjvSchema.create(testItemBMSchema).getValidationFunction(),
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
    `[AggregateError: transformMap2 resulted in 1 error(s)]`,
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
      return [null, bm]
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
    validateBM: AjvSchema.create(testItemBMSchema).getValidationFunction(),
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

test('zipping/unzipping via async hook', async () => {
  const dao = new CommonDao<Item>({
    table: TEST_TABLE,
    db,
    hooks: {
      async beforeBMToDBM(bm) {
        return {
          ...bm,
          obj: await deflateString(JSON.stringify(bm.obj)),
        }
      },
      async beforeDBMToBM(dbm) {
        return {
          ...dbm,
          obj: JSON.parse(await inflateToString(dbm.obj)),
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

test('zipping/unzipping via configuration', async () => {
  const dao = new CommonDao<Item>({
    table: TEST_TABLE,
    db,
    compress: {
      keys: ['obj', 'shu'],
    },
    hooks: {
      async beforeBMToDBM(bm) {
        expect(bm).not.toHaveProperty('data')
        return bm
      },
      async beforeDBMToBM(dbm) {
        expect(dbm).not.toHaveProperty('data')
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
      data: expect.any(Buffer),
      id: 'id0',
      updated: 1529539200,
    },
    id1: {
      created: 1529539200,
      data: expect.any(Buffer),
      id: 'id1',
      updated: 1529539200,
    },
    id2: {
      created: 1529539200,
      data: expect.any(Buffer),
      id: 'id2',
      updated: 1529539200,
    },
  })
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
