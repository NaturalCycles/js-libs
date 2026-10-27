import { DBQuery } from '@naturalcycles/db-lib'
import type { TestItemDBM } from '@naturalcycles/db-lib/testing'
import {
  createTestItemDBM,
  createTestItemsDBM,
  runCommonDaoTest,
  runCommonDBTest,
  TEST_TABLE,
  testItemBMSchema,
} from '@naturalcycles/db-lib/testing'
import { loadEnvFileIfExists, requireEnvKeys } from '@naturalcycles/nodejs-lib'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import { zip2 } from '@naturalcycles/nodejs-lib/zip'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MysqlDB } from '../mysql.db.js'

loadEnvFileIfExists()

const { MYSQL_HOST, MYSQL_USER, MYSQL_PW, MYSQL_DB } = requireEnvKeys(
  'MYSQL_HOST',
  'MYSQL_USER',
  'MYSQL_PW',
  'MYSQL_DB',
)

const db = new MysqlDB({
  // connectionLimit: 40,
  // queueLimit: 1,
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PW,
  database: MYSQL_DB,
  charset: 'utf8mb4',
  logSQL: true,
  // debugConnections: true,
  // debug: true,
  // multipleStatements: true,
})

beforeAll(async () => {
  await db.createTable(TEST_TABLE, testItemBMSchema.build(), { dropIfExists: true })
})

afterAll(async () => {
  await db.close()
})

describe('runCommonDBTest', async () => {
  await runCommonDBTest(db, { allowExtraPropertiesInResponse: true })
})

describe('runCommonDaoTest', async () => {
  await runCommonDaoTest(db, { allowExtraPropertiesInResponse: false })
})

it('should load a table schema matching the created one', async () => {
  // console.log(await db.getTables())
  const schema = await db.getTableSchema(TEST_TABLE)
  console.log(schema)
  expect(testItemBMSchema.build()).toMatchObject(schema)
})

it('should save the same batch twice without throwing', async () => {
  const items = createTestItemsDBM(1)
  // should not throw
  await db.saveBatch(TEST_TABLE, items)
  await db.saveBatch(TEST_TABLE, items)
})

it('should save and load an item with a null value without throwing', async () => {
  const item3 = {
    ...createTestItemDBM(3),
    k2: null,
  }
  await db.saveBatch(TEST_TABLE, [item3])
  const item3Loaded = (await db.getByIds<TestItemDBM>(TEST_TABLE, [item3.id]))[0]!
  console.log(item3Loaded)
  // expect(item3Loaded.k2).toBe(null)
})

it('should save emoji values without throwing', async () => {
  const items = createTestItemsDBM(5).map(r => ({ ...r, k1: `😣` }))
  // should not throw
  await db.saveBatch(TEST_TABLE, items)
})

it('should save and load a field name containing dots', async () => {
  const fieldName = 'field.with.dot'
  const table = TEST_TABLE + '2'

  const items = createTestItemsDBM(5).map(r => ({ ...r, [fieldName]: 'vv' }))
  const schema = testItemBMSchema.build()
  ;(schema.properties as Record<string, JsonSchema>)[fieldName] = { type: 'string' }

  await db.createTable(table, schema, { dropIfExists: true })
  await db.saveBatch(table, items)
  const { rows } = await db.runQuery(new DBQuery(table))
  // console.log(items2)
  expect(rows).toEqual(items)
})

it('should save and load Buffer values', async () => {
  const table = TEST_TABLE + '2'

  const extra = zip2.zstdCompressSync('hello buffer')

  const items = createTestItemsDBM(5).map(r => ({ ...r, extra }))

  const schema = testItemBMSchema.build()
  ;(schema.properties as Record<string, JsonSchema>)['extra'] = {
    type: 'object',
    instanceof: 'Buffer',
  }

  await db.createTable(table, schema, { dropIfExists: true })
  await db.saveBatch(table, items)
  const { rows } = await db.runQuery<any>(new DBQuery(table))
  // console.log(items2)
  console.log(zip2.zstdDecompressToStringSync(rows[0]!['extra']))
  expect(rows).toEqual(items)
})

it('should store object values as JSON strings', async () => {
  const item = createTestItemsDBM(1)[0]!
  item.k1 = { some: 'obj', c: 'd', e: 5 } as any

  await db.createTable(TEST_TABLE, testItemBMSchema.build(), { dropIfExists: true })
  await db.saveBatch(TEST_TABLE, [item])
  const { rows } = await db.runQuery(new DBQuery(TEST_TABLE))
  // console.log(rows)
  expect(rows).toEqual([
    {
      ...item,
      k1: JSON.stringify(item.k1),
    },
  ])
})
