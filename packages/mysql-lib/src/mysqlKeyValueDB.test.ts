import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { expect, it, vi } from 'vitest'
import { MySQLKeyValueDB } from './mysqlKeyValueDB.js'

it('should not run any SQL when deleting an empty list of ids', async () => {
  const db = new MySQLKeyValueDB({})
  vi.spyOn(db.db, 'runSQL')

  await db.deleteByIds(TEST_TABLE, [])

  expect(db.db.runSQL).not.toHaveBeenCalled()
})
