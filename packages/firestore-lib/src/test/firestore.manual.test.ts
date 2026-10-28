import { createdUpdatedFields, DBQuery } from '@naturalcycles/db-lib'
import type { TestItemDBM } from '@naturalcycles/db-lib/testing'
import { runCommonDaoTest, runCommonDBTest, TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { describe, it } from 'vitest'
import { firestoreDB } from './firestore.mock.js'

describe('runCommonDBTest', async () => {
  await runCommonDBTest(firestoreDB)
})

describe('runCommonDaoTest', async () => {
  await runCommonDaoTest(firestoreDB)
})

it('should save and load an item with an undefined field without throwing', async () => {
  const testItem: TestItemDBM = {
    id: '123',
    k1: 'k11',
    k3: undefined,
    // k3: null as any,
    ...createdUpdatedFields(),
  }
  await firestoreDB.saveBatch<TestItemDBM>(TEST_TABLE, [testItem])
  const [loaded] = await firestoreDB.getByIds(TEST_TABLE, [testItem.id])
  // console.log(loaded)

  const r = await firestoreDB.multiGet({
    [TEST_TABLE]: [loaded!.id],
  })
  console.log(r)
})

it('should stream a query with experimentalCursorStream without throwing', async () => {
  const testItem: TestItemDBM = {
    id: '123',
    k1: 'k11',
    k3: undefined,
    // k3: null as any,
    ...createdUpdatedFields(),
  }
  await firestoreDB.saveBatch<TestItemDBM>(TEST_TABLE, [testItem])

  const items = await firestoreDB
    .streamQuery(DBQuery.create(TEST_TABLE), {
      experimentalCursorStream: true,
      logLevel: 'debug',
    })
    .toArray()

  console.log(items)
})
