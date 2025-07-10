import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { pDelay } from '@naturalcycles/js-lib/promise'
import { expect, test } from 'vitest'
import { RedisClient } from './redisClient.js'
import { RedisKeyValueDB } from './redisKeyValueDB.js'

test('redis lazy initialization should not throw', async () => {
  await using _client = new RedisClient({
    redisOptions: {
      maxRetriesPerRequest: 1,
    },
  })
  await pDelay(1000)
})

test('redis connection failure should throw', async () => {
  await using client = new RedisClient({
    redisOptions: {
      port: 15464, // non-existing
      maxRetriesPerRequest: 1,
    },
  })
  const db = new RedisKeyValueDB({ client })
  await expect(db.getByIds(TEST_TABLE, ['a'])).rejects.toThrow('Reached the max retries')
})
