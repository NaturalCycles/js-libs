import 'dotenv/config'
import { DBQuery } from '@naturalcycles/db-lib'
import type { TestItemDBM } from '@naturalcycles/db-lib/testing'
import {
  createTestItemDBM,
  createTestItemsDBM,
  runCommonDaoTest,
  runCommonDBTest,
  TEST_TABLE,
  testItemBMJsonSchema,
} from '@naturalcycles/db-lib/testing'
import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { deflateString, inflateToString } from '@naturalcycles/nodejs-lib/zip'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { MysqlDB } from '../mysql.db.js'

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
  await db.createTable(TEST_TABLE, testItemBMJsonSchema, { dropIfExists: true })
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

test('getTableSchema', async () => {
  // console.log(await db.getTables())
  const schema = await db.getTableSchema(TEST_TABLE)
  console.log(schema)
  expect(testItemBMJsonSchema).toMatchObject(schema)
})

test('saveBatch overwrite', async () => {
  const items = createTestItemsDBM(1)
  // should not throw
  await db.saveBatch(TEST_TABLE, items)
  await db.saveBatch(TEST_TABLE, items)
})

test('null values', async () => {
  const item3 = {
    ...createTestItemDBM(3),
    k2: null,
  }
  await db.saveBatch(TEST_TABLE, [item3])
  const item3Loaded = (await db.getByIds<TestItemDBM>(TEST_TABLE, [item3.id]))[0]!
  console.log(item3Loaded)
  // expect(item3Loaded.k2).toBe(null)
})

test('emojis', async () => {
  const items = createTestItemsDBM(5).map(r => ({ ...r, k1: `😣` }))
  // should not throw
  await db.saveBatch(TEST_TABLE, items)
})

test('fieldName with dot', async () => {
  const fieldName = 'field.with.dot'
  const table = TEST_TABLE + '2'

  const items = createTestItemsDBM(5).map(r => ({ ...r, [fieldName]: 'vv' }))
  const schema = testItemBMJsonSchema
  schema.properties[fieldName as keyof TestItemDBM] = { type: 'string' }

  await db.createTable(table, schema, { dropIfExists: true })
  await db.saveBatch(table, items)
  const { rows } = await db.runQuery(new DBQuery(table))
  // console.log(items2)
  expect(rows).toEqual(items)
})

test('buffer', async () => {
  const table = TEST_TABLE + '2'

  const extra = await deflateString('hello buffer')

  const items = createTestItemsDBM(5).map(r => ({ ...r, extra }))

  const schema = testItemBMJsonSchema
  schema.properties['extra' as keyof TestItemDBM] = { instanceof: 'Buffer' }

  await db.createTable(table, schema, { dropIfExists: true })
  await db.saveBatch(table, items)
  const { rows } = await db.runQuery<any>(new DBQuery(table))
  // console.log(items2)
  console.log(await inflateToString(rows[0]!['extra']))
  expect(rows).toEqual(items)
})

test('stringify objects', async () => {
  const item = createTestItemsDBM(1)[0]!
  item.k1 = { some: 'obj', c: 'd', e: 5 } as any

  await db.createTable(TEST_TABLE, testItemBMJsonSchema, { dropIfExists: true })
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

test('boolean undefined', async () => {
  const accs = await db.getByIds<any>('Account', [
    '005734f1979f4ca890662c0b9f296dc2',
    '0000a67c9c034e379a938f915766540b',
    '0002ea1a93e84f12bbc12a306f452427',
  ])
  // console.log(accs.map(acc => acc.appConsent))
  console.log(
    accs.map(acc => ({
      id: acc.id,
      appConsent: acc.appConsent,
    })),
  )
  // expect undefined, true, false
})
