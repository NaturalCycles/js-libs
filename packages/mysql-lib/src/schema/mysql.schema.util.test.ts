import { InMemoryDB } from '@naturalcycles/db-lib/inmemory'
import { createTestItemsBM, TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { expect, it } from 'vitest'
import { jsonSchemaToMySQLDDL } from './mysql.schema.util.js'

it('should build CREATE TABLE DDL from a table schema', async () => {
  const items = createTestItemsBM(5)

  const db = new InMemoryDB()
  await db.saveBatch(TEST_TABLE, items)
  const schema = await db.getTableSchema(TEST_TABLE)
  // console.log(schema)

  const ddl = jsonSchemaToMySQLDDL(TEST_TABLE, schema)
  // console.log(ddl)
  expect(ddl).toMatchSnapshot()
})
