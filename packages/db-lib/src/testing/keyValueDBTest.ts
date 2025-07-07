import type { KeyValueTuple } from '@naturalcycles/js-lib'
import { _range, _sortBy } from '@naturalcycles/js-lib'
import type { CommonKeyValueDB } from '../kv/commonKeyValueDB.js'
import { TEST_TABLE } from './test.model.js'

const testIds = _range(1, 4).map(n => `id${n}`)

const testEntries: KeyValueTuple<string, Buffer>[] = testIds.map(id => [
  id,
  Buffer.from(`${id}value`),
])

export async function runCommonKeyValueDBTest(db: CommonKeyValueDB): Promise<void> {
  const { afterAll, beforeAll, expect, test } = await import('vitest')

  beforeAll(async () => {
    // Tests in this suite are not isolated,
    // and failing tests can leave the DB in an unexpected state for other tests,
    // including the following test run.
    // Here we clear the table before running the tests.
    const ids = await db.streamIds(TEST_TABLE).toArray()
    await db.deleteByIds(TEST_TABLE, ids)
  })

  afterAll(async () => {
    const ids = await db.streamIds(TEST_TABLE).toArray()
    await db.deleteByIds(TEST_TABLE, ids)
  })

  const { support } = db

  test('ping', async () => {
    await db.ping()
  })

  test('createTable', async () => {
    await db.createTable(TEST_TABLE, { dropIfExists: true })
  })

  test('deleteByIds non existing', async () => {
    await db.deleteByIds(TEST_TABLE, testIds)
  })

  test('getByIds should return empty', async () => {
    const results = await db.getByIds(TEST_TABLE, testIds)
    expect(results).toEqual([])
  })

  test('count should be 0', async () => {
    expect(await db.count(TEST_TABLE)).toBe(0)
  })

  test('saveBatch, then getByIds', async () => {
    await db.saveBatch(TEST_TABLE, testEntries)

    const entries = await db.getByIds(TEST_TABLE, testIds)
    _sortBy(entries, e => e[0], { mutate: true })
    expect(entries).toEqual(testEntries)
  })

  if (support.count) {
    test('count should be 3', async () => {
      expect(await db.count(TEST_TABLE)).toBe(3)
    })
  }

  test('streamIds', async () => {
    const ids = await db.streamIds(TEST_TABLE).toArray()
    ids.sort()
    expect(ids).toEqual(testIds)
  })

  test('streamIds limited', async () => {
    const idsLimited = await db.streamIds(TEST_TABLE, 2).toArray()
    // Order is non-deterministic, so, cannot compare values
    // idsLimited.sort()
    // expect(idsLimited).toEqual(testIds.slice(0, 2))
    expect(idsLimited.length).toBe(2)
  })

  test('streamValues', async () => {
    const values = await db.streamValues(TEST_TABLE).toArray()
    values.sort()
    expect(values).toEqual(testEntries.map(e => e[1]))
  })

  test('streamValues limited', async () => {
    const valuesLimited = await db.streamValues(TEST_TABLE, 2).toArray()
    // valuesLimited.sort()
    // expect(valuesLimited).toEqual(testEntries.map(e => e[1]).slice(0, 2))
    expect(valuesLimited.length).toBe(2)
  })

  test('streamEntries', async () => {
    const entries = await db.streamEntries(TEST_TABLE).toArray()
    entries.sort()
    expect(entries).toEqual(testEntries)
  })

  test('streamEntries limited', async () => {
    const entriesLimited = await db.streamEntries(TEST_TABLE, 2).toArray()
    // entriesLimited.sort()
    // expect(entriesLimited).toEqual(testEntries.slice(0, 2))
    expect(entriesLimited.length).toBe(2)
  })

  test('deleteByIds should clear', async () => {
    await db.deleteByIds(TEST_TABLE, testIds)
    const results = await db.getByIds(TEST_TABLE, testIds)
    expect(results).toEqual([])
  })

  if (support.increment) {
    const id = 'nonExistingField'
    const id2 = 'nonExistingField2'

    test('increment on a non-existing field should set the value to 1', async () => {
      const result = await db.incrementBatch(TEST_TABLE, [[id, 1]])
      expect(result).toEqual([[id, 1]])
    })

    test('increment on a existing field should increase the value by one', async () => {
      const result = await db.incrementBatch(TEST_TABLE, [[id, 1]])
      expect(result).toEqual([[id, 2]])
    })

    test('increment should increase the value by the specified amount', async () => {
      const result = await db.incrementBatch(TEST_TABLE, [[id, 2]])
      expect(result).toEqual([[id, 4]])
    })

    test('increment 2 ids at the same time', async () => {
      const result = await db.incrementBatch(TEST_TABLE, [
        [id, 1],
        [id2, 2],
      ])
      expect(Object.fromEntries(result)).toEqual({
        [id]: 5,
        [id2]: 2,
      })
    })
  }
}
