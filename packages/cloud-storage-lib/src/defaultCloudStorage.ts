import { _lazyValue } from '@naturalcycles/js-lib'
import { CloudStorage } from './cloudStorage.js'
import type { CommonStorage } from './commonStorage.js'
import { InMemoryCommonStorage } from './inMemoryCommonStorage.js'

// Without a chunkSize, the whole file goes in a single request that can't be retried mid-upload
const WRITE_STREAM_CHUNK_SIZE = 64 * 1024 * 1024

/**
 * Returns the default storage, which is shared by all callers.
 * It is created by `createDefaultCloudStorage` on the first call, and the same instance is returned afterwards.
 *
 * Pipeline (in nodejs-lib) uses it to read from and write to `gs://` urls.
 */
export async function getDefaultCloudStorage(): Promise<CommonStorage> {
  return await defaultCloudStorage()
}

const defaultCloudStorage = _lazyValue(createDefaultCloudStorage)

/**
 * Creates a new storage with the default configuration.
 *
 * It is a CloudStorage that authenticates with Application Default Credentials (ADC),
 * retries failed requests (uploads included) up to 15 times, for up to 10 minutes in total,
 * and uploads `getFileWriteStream` files in chunks of 64 MB.
 *
 * With APP_ENV=test it is an InMemoryCommonStorage instead, so tests never reach the real Cloud Storage.
 */
export async function createDefaultCloudStorage(): Promise<CommonStorage> {
  const { APP_ENV } = process.env
  if (APP_ENV === 'test') return new InMemoryCommonStorage()

  return await CloudStorage.create(
    {
      retryOptions: {
        // More than the default of CloudStorage.create (10): the waits between the attempts grow
        // up to 64 seconds, so 15 retries last until the total timeout of the SDK, which is 10 minutes
        maxRetries: 15,
      },
    },
    {
      writeStreamChunkSize: WRITE_STREAM_CHUNK_SIZE,
    },
  )
}
