import { runCommonKeyValueDBTest, TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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

it('count', async () => {
  const count = await db.count(TEST_TABLE)
  expect(count).toBe(0)
})
