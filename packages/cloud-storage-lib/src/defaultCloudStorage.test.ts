import { IdempotencyStrategy } from '@google-cloud/storage'
import { afterAll, expect, it, vi } from 'vitest'
import { CloudStorage } from './cloudStorage.js'
import { createDefaultCloudStorage, getDefaultCloudStorage } from './defaultCloudStorage.js'
import { InMemoryCommonStorage } from './inMemoryCommonStorage.js'

// unstubGlobals/unstubEnvs run before each test, so the last test's stubs would leak into the next file
afterAll(() => {
  vi.unstubAllEnvs()
  process.env['APP_ENV'] = 'test' // restore original value
})

it('should return the same InMemoryCommonStorage on every call of getDefaultCloudStorage', async () => {
  // Tests run with APP_ENV=test
  const storage = await getDefaultCloudStorage()

  expect(storage).toBeInstanceOf(InMemoryCommonStorage)
  expect(await getDefaultCloudStorage()).toBe(storage)
})

it('should create a new InMemoryCommonStorage on every call when APP_ENV is test', async () => {
  const storage = await createDefaultCloudStorage()

  expect(storage).toBeInstanceOf(InMemoryCommonStorage)
  expect(await createDefaultCloudStorage()).not.toBe(storage)
})

it('should create a CloudStorage with retried and chunked uploads when APP_ENV is not test', async () => {
  vi.stubEnv('APP_ENV', 'abc')

  // Creating the client makes no requests, so no credentials are needed here
  const storage = (await createDefaultCloudStorage()) as CloudStorage

  expect(storage).toBeInstanceOf(CloudStorage)
  expect(storage.cfg.writeStreamChunkSize).toBe(64 * 1024 * 1024)
  expect(storage.storage.retryOptions).toMatchObject({
    maxRetries: 10,
    idempotencyStrategy: IdempotencyStrategy.RetryAlways,
  })
})
