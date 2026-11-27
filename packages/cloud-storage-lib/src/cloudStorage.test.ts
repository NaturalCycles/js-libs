import type { File, Storage } from '@google-cloud/storage'
import type { Mock } from 'vitest'
import { expect, it, vi } from 'vitest'
import { CloudStorage } from './cloudStorage.js'

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
