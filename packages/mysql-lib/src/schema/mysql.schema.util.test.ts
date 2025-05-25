import { InMemoryDB } from '@naturalcycles/db-lib'
import { createTestItemsBM, TEST_TABLE } from '@naturalcycles/db-lib/dist/testing/index.js'
import { expect, test } from 'vitest'
import { jsonSchemaToMySQLDDL } from './mysql.schema.util.js'

test('commonSchemaToMySQLDDL', async () => {
  const items = createTestItemsBM(5)

  const db = new InMemoryDB()
  await db.saveBatch(TEST_TABLE, items)
  const schema = await db.getTableSchema(TEST_TABLE)
  // console.log(schema)

  const ddl = jsonSchemaToMySQLDDL(TEST_TABLE, schema)
  // console.log(ddl)
  expect(ddl).toMatchSnapshot()
})
