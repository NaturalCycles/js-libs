import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { expect, it } from 'vitest'
import { RedisClient } from './redisClient.js'
import { RedisKeyValueDB } from './redisKeyValueDB.js'

it('should not connect a client that is never used and dispose it without throwing', async () => {
  const client = new RedisClient({
    redisOptions: {
      maxRetriesPerRequest: 1,
    },
  })
  expect(client.connected).toBe(false)

  await client[Symbol.asyncDispose]()
  expect(client.connected).toBe(false)
})

it('should reject a query when the server is unreachable', async () => {
  await using client = new RedisClient({
    redisOptions: {
      port: 15464, // non-existing
      maxRetriesPerRequest: 1,
    },
  })
  const db = new RedisKeyValueDB({ client })
  await expect(db.getByIds(TEST_TABLE, ['a'])).rejects.toThrow('Reached the max retries')
})
