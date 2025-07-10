import { describe } from 'vitest'
import { runCommonKeyValueDaoTest, runCommonKeyValueDBTest } from '../testing/index.js'
import { InMemoryKeyValueDB } from './inMemoryKeyValueDB.js'

const db = new InMemoryKeyValueDB()

describe('runCommonKeyValueDBTest', async () => {
  await runCommonKeyValueDBTest(db)
})

describe('runCommonKeyValueDaoTest', async () => {
  await runCommonKeyValueDaoTest(db)
})
