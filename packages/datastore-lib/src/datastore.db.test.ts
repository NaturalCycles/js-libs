import { Datastore } from '@google-cloud/datastore'
import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { afterAll, expect, it, vi } from 'vitest'
import { DatastoreDB } from './datastore.db.js'

afterAll(() => {
  process.env['APP_ENV'] = 'test' // restore original value
})

it('should throw on missing id', async () => {
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

it('should create the Datastore client on first use and reuse it', () => {
  vi.stubEnv('APP_ENV', 'abc') // to not throw on APP_ENV=test check

  const db = new DatastoreDB()
  const ds = db.ds()
  expect(ds).toBeInstanceOf(Datastore)
  expect(db.ds()).toBe(ds)
})

it('should throw when APP_ENV is test', () => {
  vi.stubEnv('APP_ENV', 'test')

  const db = new DatastoreDB()
  expect(() => db.ds()).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: DatastoreDB cannot be used in Test env, please use InMemoryDB]`,
  )
})
