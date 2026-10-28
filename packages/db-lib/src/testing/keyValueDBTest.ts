import { _range, _sortBy } from '@naturalcycles/js-lib/array'
import type { KeyValueTuple } from '@naturalcycles/js-lib/types'
import type { CommonKeyValueDB } from '../kv/commonKeyValueDB.js'
import { TEST_TABLE } from './test.model.js'

const testIds = _range(1, 4).map(n => `id${n}`)

const testEntries: KeyValueTuple<string, Buffer>[] = testIds.map(id => [
  id,
  Buffer.from(`${id}value`),
])

export async function runCommonKeyValueDBTest(db: CommonKeyValueDB): Promise<void> {
  const { afterAll, beforeAll, expect, it } = await import('vitest')

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

  it('should respond to ping', async () => {
    await db.ping()
  })

  it('should create the table, dropping an existing one', async () => {
    await db.createTable(TEST_TABLE, { dropIfExists: true })
  })

  it('should not throw when deleting ids that do not exist', async () => {
    await db.deleteByIds(TEST_TABLE, testIds)
  })

  it('should return no entries for ids that do not exist', async () => {
    const results = await db.getByIds(TEST_TABLE, testIds)
    expect(results).toEqual([])
  })

  if (support.count) {
    it('should count 0 entries in an empty table', async () => {
      expect(await db.count(TEST_TABLE)).toBe(0)
    })
  }

  it('should return the saved entries by ids', async () => {
    await db.saveBatch(TEST_TABLE, testEntries)

    const entries = await db.getByIds(TEST_TABLE, testIds)
    _sortBy(entries, e => e[0], { mutate: true })
    expect(entries).toEqual(testEntries)
  })

  if (support.count) {
    it('should count the saved entries', async () => {
      expect(await db.count(TEST_TABLE)).toBe(3)
    })
  }

  it('should stream all ids', async () => {
    const ids = await db.streamIds(TEST_TABLE).toArray()
    ids.sort()
    expect(ids).toEqual(testIds)
  })

  it('should stream as many ids as the limit', async () => {
    const idsLimited = await db.streamIds(TEST_TABLE, 2).toArray()
    // Order is non-deterministic, so, cannot compare values
    // idsLimited.sort()
    // expect(idsLimited).toEqual(testIds.slice(0, 2))
    expect(idsLimited.length).toBe(2)
  })

  it('should stream all values', async () => {
    const values = await db.streamValues(TEST_TABLE).toArray()
    values.sort()
    expect(values).toEqual(testEntries.map(e => e[1]))
  })

  it('should stream as many values as the limit', async () => {
    const valuesLimited = await db.streamValues(TEST_TABLE, 2).toArray()
    // valuesLimited.sort()
    // expect(valuesLimited).toEqual(testEntries.map(e => e[1]).slice(0, 2))
    expect(valuesLimited.length).toBe(2)
  })

  it('should stream all entries', async () => {
    const entries = await db.streamEntries(TEST_TABLE).toArray()
    entries.sort()
    expect(entries).toEqual(testEntries)
  })

  it('should stream as many entries as the limit', async () => {
    const entriesLimited = await db.streamEntries(TEST_TABLE, 2).toArray()
    // entriesLimited.sort()
    // expect(entriesLimited).toEqual(testEntries.slice(0, 2))
    expect(entriesLimited.length).toBe(2)
  })

  it('should delete the entries by ids', async () => {
    await db.deleteByIds(TEST_TABLE, testIds)
    const results = await db.getByIds(TEST_TABLE, testIds)
    expect(results).toEqual([])
  })

  if (support.count) {
    it('should count 0 entries after deleting them', async () => {
      expect(await db.count(TEST_TABLE)).toBe(0)
    })
  }

  if (support.increment) {
    const id = 'nonExistingField'
    const id2 = 'nonExistingField2'

    it('should increment a missing key from 0', async () => {
      const result = await db.incrementBatch(TEST_TABLE, [[id, 1]])
      expect(result).toEqual([[id, 1]])
    })

    it('should increment an existing key by 1', async () => {
      const result = await db.incrementBatch(TEST_TABLE, [[id, 1]])
      expect(result).toEqual([[id, 2]])
    })

    it('should increment an existing key by the given amount', async () => {
      const result = await db.incrementBatch(TEST_TABLE, [[id, 2]])
      expect(result).toEqual([[id, 4]])
    })

    it('should increment two keys in one batch', async () => {
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
