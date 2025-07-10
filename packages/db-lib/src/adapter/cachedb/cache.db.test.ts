import { describe } from 'vitest'
import { InMemoryDB } from '../../inmemory/inMemory.db.js'
import { runCommonDaoTest, runCommonDBTest } from '../../testing/index.js'
import { CacheDB } from './cache.db.js'

const downstreamDB = new InMemoryDB()
const cacheDB = new InMemoryDB()
const db = new CacheDB({
  name: 'cache-db',
  cacheDB,
  downstreamDB,
  logCached: true,
  logDownstream: true,
})

describe('runCommonDBTest', async () => {
  await runCommonDBTest(db)
})

describe('runCommonDaoTest', async () => {
  await runCommonDaoTest(db)
})
