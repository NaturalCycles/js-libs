import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { afterAll, expect, test, vi } from 'vitest'
import { DatastoreDB } from './datastore.db.js'

afterAll(() => {
  process.env['APP_ENV'] = 'test' // restore
})

test('should throw on missing id', async () => {
  vi.stubEnv('APP_ENV', 'abc') // to not throw on APP_ENV=test check

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
  vi.stubEnv('APP_ENV', 'abc') // to not throw on APP_ENV=test check

  const db = new DatastoreDB()
  const ds = db.ds()
  expect(ds.KEY.description).toBe('KEY')
})
