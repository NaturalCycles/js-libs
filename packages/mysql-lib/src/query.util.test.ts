import { DBQuery } from '@naturalcycles/db-lib'
import { createTestItemDBM, createTestItemsDBM, TEST_TABLE } from '@naturalcycles/db-lib/testing'
import * as mysql from 'mysql'
import { expect, it } from 'vitest'
import {
  dbQueryToSQLDelete,
  dbQueryToSQLSelect,
  dbQueryToSQLUpdate,
  insertSQL,
} from './query.util.js'

it('should build SELECT with filters, NULL checks, IN lists, order and limit', () => {
  let sql = dbQueryToSQLSelect(new DBQuery('TBL1'))
  expect(sql).toMatchSnapshot()

  sql = dbQueryToSQLSelect(
    new DBQuery<any>('TBL1')
      .filterEq('a', 'b')
      .filter('c', '>', '2019')
      .order('aaa')
      .order('bbb', true)
      .limit(15),
  )
  // console.log(sql) //
  expect(sql).toMatchSnapshot()

  sql = dbQueryToSQLSelect(new DBQuery<any>('TBL1').filter('num', '>', 15))
  // console.log(sql)
  expect(sql).toMatchSnapshot()

  // NULL cases
  sql = dbQueryToSQLSelect(
    new DBQuery<any>('TBL1').filterEq('a', undefined).filterEq('a2', null).filter('a3', '>', null),
  )
  // console.log(sql)
  expect(sql).toMatchSnapshot()

  // ARRAY CASES
  sql = dbQueryToSQLSelect(new DBQuery<any>('TBL1').filterEq('a', ['a1', 'a2', 'a3']))
  // console.log(sql)
  expect(sql).toMatchSnapshot()
})

it('should build DELETE with and without a filter', () => {
  let sql = dbQueryToSQLDelete(new DBQuery('TBL1'))
  expect(sql).toMatchSnapshot()

  sql = dbQueryToSQLDelete(new DBQuery<any>('TBL1').filter('a', '>', null))
  expect(sql).toMatchSnapshot()
})

it('should build one INSERT statement for a few rows', () => {
  const items = createTestItemsDBM(3)
  const [sql] = insertSQL(TEST_TABLE, items)
  // console.log(sql)
  expect(sql).toMatchSnapshot()
})

it('should build UPDATE with and without a filter', () => {
  const item = createTestItemDBM()

  let sql = dbQueryToSQLUpdate(new DBQuery(TEST_TABLE), item)
  // console.log(sql)
  expect(sql).toMatchSnapshot()

  sql = dbQueryToSQLUpdate(new DBQuery<any>(TEST_TABLE).filter('a', '>', 5), item)
  // console.log(sql)
  expect(sql).toMatchSnapshot()
})

it('should write object and array values as JSON strings in INSERT', () => {
  const [sql] = insertSQL(TEST_TABLE, [{ id: 'id1', ...createValuesOfEveryKind() }])
  expect(sql).toBe(
    'INSERT INTO `TEST_TABLE` (`id`,`nested`,`list`,`buf`,`date`,`raw`,`empty`) VALUES\n' +
      `('id1','{\\"foo\\":1}','[\\"a\\",\\"b\\"]',X'6869','2018-06-21 12:30:00.000',NOW(),NULL)`,
  )
})

it('should write object and array values as JSON strings in UPDATE', () => {
  const sql = dbQueryToSQLUpdate(
    new DBQuery<any>(TEST_TABLE).filterEq('id', 'id1'),
    createValuesOfEveryKind(),
  )
  expect(sql).toBe(
    `UPDATE \`TEST_TABLE\` SET \`nested\` = '{\\"foo\\":1}', \`list\` = '[\\"a\\",\\"b\\"]', ` +
      `\`buf\` = X'6869', \`date\` = '2018-06-21 12:30:00.000', \`raw\` = NOW(), \`empty\` = NULL ` +
      `WHERE \`id\` = 'id1'`,
  )
})

it('should split a large INSERT into several statements', () => {
  const items = createTestItemsDBM(10).map(r => ({ ...r, lng: 'xxx'.repeat(80000) }))
  const sqls = insertSQL(TEST_TABLE, items)
  // console.log(sqls)
  console.log(sqls.length)
  expect(sqls.length).toBeGreaterThan(1)
})

function createValuesOfEveryKind(): Record<string, any> {
  return {
    nested: { foo: 1 },
    list: ['a', 'b'],
    buf: Buffer.from('hi'),
    date: new Date(2018, 5, 21, 12, 30),
    raw: mysql.raw('NOW()'),
    empty: null,
  }
}
