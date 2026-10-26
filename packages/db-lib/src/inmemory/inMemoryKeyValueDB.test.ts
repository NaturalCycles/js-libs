import { describe, expect, it } from 'vitest'
import { runCommonKeyValueDaoTest, runCommonKeyValueDBTest } from '../testing/index.js'
import { InMemoryKeyValueDB } from './inMemoryKeyValueDB.js'

const db = new InMemoryKeyValueDB()

describe('runCommonKeyValueDBTest', async () => {
  await runCommonKeyValueDBTest(db)
})

describe('runCommonKeyValueDaoTest', async () => {
  await runCommonKeyValueDaoTest(db)
})

it('clear removes all tables', async () => {
  const kvDB = new InMemoryKeyValueDB()
  await kvDB.saveBatch('table1', [['id1', Buffer.from('v1')]])
  await kvDB.saveBatch('table2', [['id2', Buffer.from('v2')]])

  kvDB.clear()

  expect(kvDB.data).toEqual({})
})
