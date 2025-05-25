import { runCommonKeyValueDBTest, TEST_TABLE } from '@naturalcycles/db-lib/dist/testing/index.js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { BetterSqliteKeyValueDB } from './betterSqliteKeyValueDB.js'

const db = new BetterSqliteKeyValueDB({
  filename: ':memory:',
})

beforeAll(async () => {
  // await db.ping()

  // await db.getTables()
  await db.createTable(TEST_TABLE, { dropIfExists: true })
})

afterAll(() => db.close())

describe('runCommonKeyValueDBTest', async () => {
  await runCommonKeyValueDBTest(db)
})

test('count', async () => {
  const count = await db.count(TEST_TABLE)
  expect(count).toBe(0)
})
