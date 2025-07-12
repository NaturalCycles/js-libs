import { _sortBy } from '@naturalcycles/js-lib/array/array.util.js'
import { CommonKeyValueDao } from '../kv/commonKeyValueDao.js'
import type { CommonKeyValueDB, KeyValueDBTuple } from '../kv/commonKeyValueDB.js'
import { createTestItemsBM, TEST_TABLE } from './test.model.js'

const testItems = createTestItemsBM(4)
const testIds = testItems.map(e => e.id)
const testEntries: KeyValueDBTuple[] = testItems.map(e => [e.id, Buffer.from(`${e.id}value`)])

export async function runCommonKeyValueDaoTest(db: CommonKeyValueDB): Promise<void> {
  const { afterAll, beforeAll, expect, test } = await import('vitest')

  const dao = new CommonKeyValueDao({
    db,
    table: TEST_TABLE,
    // todo: make this test support "deflatedJson" transformer
  })
  const { support } = db

  beforeAll(async () => {
    // Tests in this suite are not isolated,
    // and failing tests can leave the DB in an unexpected state for other tests,
    // including the following test run.
    // Here we clear the table before running the tests.
    const ids = await dao.streamIds().toArray()
    await dao.deleteByIds(ids)
  })

  afterAll(async () => {
    const ids = await dao.streamIds().toArray()
    await dao.deleteByIds(ids)
  })

  test('ping', async () => {
    await dao.ping()
  })

  test('createTable', async () => {
    await dao.createTable({ dropIfExists: true })
  })

  test('deleteByIds non existing', async () => {
    await dao.deleteByIds(testIds)
  })

  test('getByIds should return empty', async () => {
    const results = await dao.getByIds(testIds)
    expect(results).toEqual([])
  })

  test('saveBatch, then getByIds', async () => {
    await dao.saveBatch(testEntries)

    const entries = await dao.getByIds(testIds)
    // console.log(typeof entries[0]![1], entries[0]![1])

    _sortBy(entries, e => e[0], { mutate: true })
    expect(entries).toEqual(testEntries) // Jest doesn't allow to compare Buffers directly
    // expect(entries.map(e => e[0])).toEqual(testEntries.map(e => e[0]))
    // expect(entries.map(e => e[1].toString())).toEqual(testEntries.map(e => e[1].toString()))
  })

  test('streamIds', async () => {
    const ids = await dao.streamIds().toArray()
    ids.sort()
    expect(ids).toEqual(testIds)
  })

  test('streamIds limited', async () => {
    const idsLimited = await dao.streamIds(2).toArray()
    // Order is non-deterministic, so, cannot compare values
    // idsLimited.sort()
    // expect(idsLimited).toEqual(testIds.slice(0, 2))
    expect(idsLimited.length).toBe(2)
  })

  test('streamValues', async () => {
    const values = await dao.streamValues().toArray()
    values.sort()
    expect(values).toEqual(testEntries.map(e => e[1]))
  })

  test('streamValues limited', async () => {
    const valuesLimited = await dao.streamValues(2).toArray()
    // valuesLimited.sort()
    // expect(valuesLimited).toEqual(testEntries.map(e => e[1]).slice(0, 2))
    expect(valuesLimited.length).toBe(2)
  })

  test('streamEntries', async () => {
    const entries = await dao.streamEntries().toArray()
    entries.sort()
    expect(entries).toEqual(testEntries)
  })

  test('streamEntries limited', async () => {
    const entriesLimited = await dao.streamEntries(2).toArray()
    // entriesLimited.sort()
    // expect(entriesLimited).toEqual(testEntries.slice(0, 2))
    expect(entriesLimited.length).toBe(2)
  })

  test('deleteByIds should clear', async () => {
    await dao.deleteByIds(testIds)
    const results = await dao.getByIds(testIds)
    expect(results).toEqual([])
  })

  if (support.increment) {
    const id = 'nonExistingField'
    const id2 = 'nonExistingField2'

    test('increment on a non-existing field should set the value to 1', async () => {
      const result = await dao.increment(id)
      expect(result).toBe(1)
    })

    test('increment on a existing field should increase the value by one', async () => {
      const result = await dao.increment(id)
      expect(result).toBe(2)
    })

    test('increment should increase the value by the specified amount', async () => {
      const result = await dao.increment(id, 2)
      expect(result).toBe(4)
    })

    test('increment 2 ids at the same time', async () => {
      const result = await dao.incrementBatch([
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
