import { Datastore } from '@google-cloud/datastore'
import { DBQuery } from '@naturalcycles/db-lib'
import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { expect, test } from 'vitest'
import { dbQueryToDatastoreQuery } from './query.util.js'

test('dbQueryToDatastoreQuery passes limit and offset', () => {
  const ds = new Datastore()

  // no limit/offset by default
  let q = dbQueryToDatastoreQuery(DBQuery.create(TEST_TABLE), ds.createQuery(TEST_TABLE))
  expect(q.limitVal).toBe(0)
  expect(q.offsetVal).toBe(-1) // -1 means "no offset" in Datastore

  q = dbQueryToDatastoreQuery(
    DBQuery.create(TEST_TABLE).limit(10).offset(20),
    ds.createQuery(TEST_TABLE),
  )
  expect(q.limitVal).toBe(10)
  expect(q.offsetVal).toBe(20)
})
