import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { expect, it } from 'vitest'
import { RedisClient } from './redisClient.js'
import { RedisKeyValueDB } from './redisKeyValueDB.js'

it('should not throw when a client is created but never used', async () => {
  await using _ = new RedisClient({
    redisOptions: {
      maxRetriesPerRequest: 1,
    },
  })
  await pDelay(1000)
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
