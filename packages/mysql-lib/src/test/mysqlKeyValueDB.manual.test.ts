import 'dotenv/config'
import { runCommonKeyValueDBTest, TEST_TABLE } from '@naturalcycles/db-lib/dist/testing/index.js'
import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { MySQLKeyValueDB } from '../mysqlKeyValueDB.js'

const { MYSQL_HOST, MYSQL_USER, MYSQL_PW, MYSQL_DB } = requireEnvKeys(
  'MYSQL_HOST',
  'MYSQL_USER',
  'MYSQL_PW',
  'MYSQL_DB',
)

const db = new MySQLKeyValueDB({
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PW,
  database: MYSQL_DB,
  charset: 'utf8mb4',
  logSQL: true,
  // debug: true,
})

beforeAll(async () => {
  await db.createTable(TEST_TABLE, { dropIfExists: true })
})

afterAll(async () => {
  await db.close()
})

describe('runCommonKeyValueDBTest', async () => {
  await runCommonKeyValueDBTest(db)
})

test('count', async () => {
  const count = await db.count(TEST_TABLE)
  expect(count).toBe(0)
})

// test('test1', async () => {
//   await db.deleteByIds(TEST_TABLE, ['id1', 'id2'])
//   await db.saveBatch(TEST_TABLE, {
//     k1: Buffer.from('hello1'),
//     k2: Buffer.from('hello2'),
//   })
// })
