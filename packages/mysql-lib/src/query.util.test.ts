import { DBQuery } from '@naturalcycles/db-lib'
import {
  createTestItemDBM,
  createTestItemsDBM,
  TEST_TABLE,
} from '@naturalcycles/db-lib/dist/testing/index.js'
import { expect, test } from 'vitest'
import {
  dbQueryToSQLDelete,
  dbQueryToSQLSelect,
  dbQueryToSQLUpdate,
  insertSQL,
} from './query.util.js'

test('dbQueryToSQLSelect', () => {
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
  // console.log(sql)
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

test('dbQueryToSQLDelete', () => {
  let sql = dbQueryToSQLDelete(new DBQuery('TBL1'))
  expect(sql).toMatchSnapshot()

  sql = dbQueryToSQLDelete(new DBQuery<any>('TBL1').filter('a', '>', null))
  expect(sql).toMatchSnapshot()
})

test('insertSQL', () => {
  const items = createTestItemsDBM(3)
  const [sql] = insertSQL(TEST_TABLE, items)
  // console.log(sql)
  expect(sql).toMatchSnapshot()
})

test('dbQueryToSQLUpdate', () => {
  const item = createTestItemDBM()

  let sql = dbQueryToSQLUpdate(new DBQuery(TEST_TABLE), item)
  // console.log(sql)
  expect(sql).toMatchSnapshot()

  sql = dbQueryToSQLUpdate(new DBQuery<any>(TEST_TABLE).filter('a', '>', 5), item)
  // console.log(sql)
  expect(sql).toMatchSnapshot()
})

test('large sql query split', () => {
  const items = createTestItemsDBM(10).map(r => ({ ...r, lng: 'xxx'.repeat(80000) }))
  const sqls = insertSQL(TEST_TABLE, items)
  // console.log(sqls)
  console.log(sqls.length)
  expect(sqls.length).toBeGreaterThan(1)
})
