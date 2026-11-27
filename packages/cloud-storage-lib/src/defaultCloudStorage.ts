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
 * retries failed requests (uploads included) up to 10 times,
 * and uploads `getFileWriteStream` files in chunks of 64 MB.
 *
 * With APP_ENV=test it is an InMemoryCommonStorage instead, so tests never reach the real Cloud Storage.
 */
export async function createDefaultCloudStorage(): Promise<CommonStorage> {
  const { APP_ENV } = process.env
  if (APP_ENV === 'test') return new InMemoryCommonStorage()

  const { IdempotencyStrategy } = await import('@google-cloud/storage')

  return await CloudStorage.create(
    {
      retryOptions: {
        maxRetries: 10, // default is 3
        // By default (RetryConditional) the SDK does NOT retry object writes unless an
        // `ifGenerationMatch` precondition is set. Files are written as a whole, and the last write wins,
        // so retrying is always safe.
        idempotencyStrategy: IdempotencyStrategy.RetryAlways,
      },
    },
    {
      writeStreamChunkSize: WRITE_STREAM_CHUNK_SIZE,
    },
  )
}
