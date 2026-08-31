import { Firestore } from '@google-cloud/firestore'
import { DBQuery } from '@naturalcycles/db-lib'
import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { expect, test } from 'vitest'
import { dbQueryToFirestoreQuery } from './query.util.js'

test('dbQueryToFirestoreQuery passes limit and offset', () => {
  const firestore = new Firestore()

  // no limit/offset by default
  let q = dbQueryToFirestoreQuery(DBQuery.create(TEST_TABLE), firestore.collection(TEST_TABLE))
  expect((q as any)._queryOptions.limit).toBeUndefined()
  expect((q as any)._queryOptions.offset).toBeUndefined()

  q = dbQueryToFirestoreQuery(
    DBQuery.create(TEST_TABLE).limit(10).offset(20),
    firestore.collection(TEST_TABLE),
  )
  expect((q as any)._queryOptions.limit).toBe(10)
  expect((q as any)._queryOptions.offset).toBe(20)
})
