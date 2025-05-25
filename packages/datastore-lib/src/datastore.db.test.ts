import { TEST_TABLE } from '@naturalcycles/db-lib/dist/testing/index.js'
import { expect, test } from 'vitest'
import { DatastoreDB } from './datastore.db.js'

test('should throw on missing id', async () => {
  process.env['APP_ENV'] = 'abc' // to not throw on APP_ENV=test check

  const db = new DatastoreDB()
  // const ds = db.ds()

  // Should not throw here
  await db.saveBatch(TEST_TABLE, [])

  await expect(
    db.saveBatch(TEST_TABLE, [{ k: 'k' } as any]),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: Cannot save "TEST_TABLE" entity without "id"]`,
  )
})

test('can load datastore', async () => {
  process.env['APP_ENV'] = 'abc' // to not throw on APP_ENV=test check

  const db = new DatastoreDB()
  const ds = await db.ds()
  expect(ds.KEY.description).toBe('KEY')
})
