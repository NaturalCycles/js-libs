import { IdempotencyStrategy } from '@google-cloud/storage'
import type { File, Storage } from '@google-cloud/storage'
import type { Mock } from 'vitest'
import { expect, it, vi } from 'vitest'
import { CloudStorage } from './cloudStorage.js'

// Creating a client makes no requests, so no credentials are needed in these tests

it('should create a client that retries uploads up to 10 times by default', async () => {
  const { storage } = await CloudStorage.create()

  expect(storage.retryOptions).toMatchObject({
    maxRetries: 10,
    idempotencyStrategy: IdempotencyStrategy.RetryAlways,
  })
})

it('should create a client from a service account with the same default retry options', async () => {
  const { storage } = await CloudStorage.createFromGCPServiceAccount()

  expect(storage.retryOptions).toMatchObject({
    maxRetries: 10,
    idempotencyStrategy: IdempotencyStrategy.RetryAlways,
  })
})

it('should let storageOptions.retryOptions override the default retry options one by one', async () => {
  const { storage } = await CloudStorage.create({
    retryOptions: { maxRetries: 2, maxRetryDelay: 5 },
  })

  expect(storage.retryOptions).toMatchObject({
    maxRetries: 2,
    maxRetryDelay: 5,
    idempotencyStrategy: IdempotencyStrategy.RetryAlways,
  })
})

it('should keep the other storageOptions next to the default retry options', async () => {
  const { storage } = await CloudStorage.create({ projectId: 'some-project' })

  expect(storage.projectId).toBe('some-project')
  expect(storage.retryOptions.maxRetries).toBe(10)
})

it('should upload getFileWriteStream in a single request by default', () => {
  const { storage, createWriteStream } = fakeStorage()

  CloudStorage.createFromStorage(storage).getFileWriteStream('b', 'a/1')

  expect(createWriteStream).toHaveBeenCalledExactlyOnceWith({ chunkSize: undefined })
})

it('should upload getFileWriteStream in chunks of writeStreamChunkSize', () => {
  const { storage, createWriteStream } = fakeStorage()
  const writeStreamChunkSize = 8 * 1024 * 1024

  CloudStorage.createFromStorage(storage, { writeStreamChunkSize }).getFileWriteStream('b', 'a/1')

  expect(createWriteStream).toHaveBeenCalledExactlyOnceWith({ chunkSize: writeStreamChunkSize })
})

/**
 * Only the part of Storage that getFileWriteStream calls.
 */
function fakeStorage(): { storage: Storage; createWriteStream: Mock<File['createWriteStream']> } {
  const createWriteStream = vi.fn<File['createWriteStream']>()
  const storage = {
    bucket: () => ({
      file: () => ({ createWriteStream }),
    }),
  } as any as Storage

  return { storage, createWriteStream }
}
