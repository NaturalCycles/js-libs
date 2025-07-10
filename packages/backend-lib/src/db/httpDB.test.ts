import { InMemoryDB } from '@naturalcycles/db-lib/inmemory'
import { runCommonDaoTest, runCommonDBTest } from '@naturalcycles/db-lib/testing'
import { afterAll, describe } from 'vitest'
import { expressTestService } from '../testing/index.js'
import { HttpDB } from './httpDB.js'
import { httpDBRequestHandler } from './httpDBRequestHandler.js'

const inMemoryDB = new InMemoryDB()

const app = await expressTestService.createAppFromResource(httpDBRequestHandler(inMemoryDB))

const db = new HttpDB({
  baseUrl: app.cfg.baseUrl,
  retry: { count: 0 },
})

afterAll(async () => {
  await app.close()
})

describe('runCommonDBTest', async () => {
  await runCommonDBTest(db)
})

// todo: unskip and figure it out
describe.skip('runCommonDaoTest', async () => {
  await runCommonDaoTest(db)
})
