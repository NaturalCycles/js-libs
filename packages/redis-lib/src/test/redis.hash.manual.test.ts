import { CommonKeyValueDao, CommonKeyValueDaoMemoCache } from '@naturalcycles/db-lib/kv'
import {
  runCommonKeyValueDaoTest,
  runCommonKeyValueDBTest,
  TEST_TABLE,
} from '@naturalcycles/db-lib/testing'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { _AsyncMemo } from '@naturalcycles/js-lib/decorators'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { RedisClient } from '../redisClient.js'
import { RedisHashKeyValueDB } from '../redisHashKeyValueDB.js'

const client = new RedisClient()
const db = new RedisHashKeyValueDB({ client })

const dao = new CommonKeyValueDao<string, Buffer>({
  db,
  table: TEST_TABLE,
})

afterAll(async () => {
  await client.disconnect()
})

it('should ping the server', async () => {
  await db.ping()
})

describe('runCommonKeyValueDBTest', async () => {
  await runCommonKeyValueDBTest(db)
})

describe('runCommonKeyValueDaoTest', async () => {
  await runCommonKeyValueDaoTest(db)
})

it('should call a memoized method once for serial calls, serving the rest from the cache', async () => {
  const key = 'memoSerial'
  await dao.deleteByIds([key])
  const c = new C()

  expect(await c.get(key)).toEqual(Buffer.from(key))
  await vi.waitFor(async () => expect(await dao.getById(key)).toEqual(Buffer.from(key)))

  for (const _ of _range(9)) {
    expect(await c.get(key)).toEqual(Buffer.from(key))
  }

  expect(c.calls).toBe(1)
})

it('should call a memoized method once for concurrent calls', async () => {
  const key = 'memoConcurrent'
  await dao.deleteByIds([key])
  const c = new C()

  const results = await Promise.all(_range(30).map(async () => await c.get(key)))

  expect(results).toEqual(_range(30).map(() => Buffer.from(key)))
  expect(c.calls).toBe(1)
})

class C {
  calls = 0

  @_AsyncMemo({
    cacheFactory: () =>
      new CommonKeyValueDaoMemoCache({
        dao,
      }),
  })
  async get(k: string): Promise<Buffer | null> {
    this.calls++
    return Buffer.from(k)
  }
}
