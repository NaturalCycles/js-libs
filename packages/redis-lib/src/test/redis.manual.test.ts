import type { KeyValueDBTuple } from '@naturalcycles/db-lib/kv'
import { CommonKeyValueDao, CommonKeyValueDaoMemoCache } from '@naturalcycles/db-lib/kv'
import {
  runCommonKeyValueDaoTest,
  runCommonKeyValueDBTest,
  TEST_TABLE,
} from '@naturalcycles/db-lib/testing'
import { _range } from '@naturalcycles/js-lib'
import { localTime } from '@naturalcycles/js-lib/datetime'
import { _AsyncMemo } from '@naturalcycles/js-lib/decorators'
import { pDelay } from '@naturalcycles/js-lib/promise'
import { afterAll, describe, expect, test } from 'vitest'
import { RedisClient } from '../redisClient.js'
import { RedisKeyValueDB } from '../redisKeyValueDB.js'

const client = new RedisClient()
const db = new RedisKeyValueDB({ client })

const dao = new CommonKeyValueDao<string, Buffer>({
  db,
  table: TEST_TABLE,
})

afterAll(async () => {
  await client.disconnect()
})

test('connect', async () => {
  await db.ping()
})

describe('runCommonKeyValueDBTest', async () => {
  await runCommonKeyValueDBTest(db)
})

describe('runCommonKeyValueDaoTest', async () => {
  await runCommonKeyValueDaoTest(db)
})

test('saveBatch with EXAT', async () => {
  const testIds = _range(1, 4).map(n => `id${n}`)
  const testEntries: KeyValueDBTuple[] = testIds.map(id => [id, Buffer.from(`${id}value`)])

  await db.saveBatch(TEST_TABLE, testEntries, {
    expireAt: localTime.now().plus(1, 'second').unix,
  })
  let loaded = await db.getByIds(TEST_TABLE, testIds)
  expect(loaded).toHaveLength(3)
  await pDelay(2000)
  loaded = await db.getByIds(TEST_TABLE, testIds)
  expect(loaded).toHaveLength(0)
})

class C {
  @_AsyncMemo({
    cacheFactory: () =>
      new CommonKeyValueDaoMemoCache({
        dao,
        ttl: 1,
      }),
  })
  async get(k: string): Promise<Buffer | null> {
    console.log(`get ${k}`)
    return Buffer.from(k)
  }
}

const c = new C()

test('CommonKeyValueDaoMemoCache serial', async () => {
  for (const _ of _range(10)) {
    console.log(await c.get('key'))
    await pDelay(100)
  }
})

test('CommonKeyValueDaoMemoCache async swarm', async () => {
  await Promise.all(
    _range(30).map(async () => {
      console.log(await c.get('key'))
    }),
  )
})
