import { runCommonKeyValueDBTest, TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { afterAll, beforeAll, describe } from 'vitest'
import { SqliteKeyValueDB } from './sqliteKeyValueDB.js'

const db = new SqliteKeyValueDB({
  filename: ':memory:',
})

beforeAll(async () => {
  await db.createTable(TEST_TABLE, { dropIfExists: true })
})

afterAll(() => db.close())

describe('runCommonKeyValueDBTest', async () => {
  await runCommonKeyValueDBTest(db)
})
