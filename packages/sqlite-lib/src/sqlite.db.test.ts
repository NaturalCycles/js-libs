import {
  createTestItemsDBM,
  TEST_TABLE,
  testItemBMJsonSchema,
} from '@naturalcycles/db-lib/dist/testing/index.js'
import { _omit } from '@naturalcycles/js-lib'
import { test } from 'vitest'
import { SQLiteDB } from './sqlite.db.js'

test('test1', async () => {
  const db = new SQLiteDB({
    filename: ':memory:',
  })

  await db.ping()

  // await db.getTables()
  await db.createTable(TEST_TABLE, testItemBMJsonSchema, { dropIfExists: true })

  const items = createTestItemsDBM(3).map(v => _omit(v, ['nested']))
  await db.saveBatch(TEST_TABLE, items)

  await db.close()
})
