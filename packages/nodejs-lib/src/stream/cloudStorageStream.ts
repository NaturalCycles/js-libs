import { PassThrough } from 'node:stream'
import type { Writable } from 'node:stream'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { _noop } from '@naturalcycles/js-lib/types'
import type { ReadableTyped, WritableTyped } from './stream.model.js'

const CLOUD_STORAGE_URL_PREFIX = 'gs://'
const CLOUD_STORAGE_LIB = '@naturalcycles/cloud-storage-lib'

/**
 * Returns a binary Readable (objectMode=false) of the Cloud Storage file at `gs://bucket/path/to/file`.
 *
 * The Readable is returned immediately, while the storage is loaded asynchronously and piped into it
 * afterwards. It is the same approach as in `createReadableFromAsync`.
 *
 * The file is read from the default storage of `@naturalcycles/cloud-storage-lib`,
 * which is an optional peer dependency.
 */
export function createCloudStorageReadStream(url: string): ReadableTyped<Uint8Array> {
  const { bucketName, filePath } = parseCloudStorageUrl(url)
  const readable = new PassThrough()

  // The read can fail before any consumer is attached, and an 'error' event without a listener
  // crashes the process. With this listener the error is kept in the stream instead,
  // and the consumer gets it when it attaches.
  readable.on('error', _noop)

  void getDefaultCloudStorage()
    .then(async storage => {
      await storage.getFileReadStream(bucketName, filePath).to(readable)
    })
    // If `readable` is already destroyed (e.g. the consumer stopped early) - this `destroy` does nothing
    .catch(err => readable.destroy(err))

  return readable
}

/**
 * Returns a binary Writable (objectMode=false) for the Cloud Storage file at `gs://bucket/path/to/file`.
 *
 * The file is written to the default storage of `@naturalcycles/cloud-storage-lib`,
 * which is an optional peer dependency.
 */
export async function createCloudStorageWriteStream(
  url: string,
): Promise<WritableTyped<Uint8Array>> {
  const { bucketName, filePath } = parseCloudStorageUrl(url)
  const storage = await getDefaultCloudStorage()
  return storage.getFileWriteStream(bucketName, filePath)
}

function parseCloudStorageUrl(url: string): CloudStorageUrl {
  assertCloudStorageUrl(url)

  const [bucketName, ...pathParts] = url.slice(CLOUD_STORAGE_URL_PREFIX.length).split('/')
  const filePath = pathParts.join('/')

  _assert(
    bucketName && filePath,
    `Cloud Storage url should look like gs://bucket/path/to/file but got: ${url}`,
  )

  return { bucketName, filePath }
}

/**
 * Throws if the given url is not a Cloud Storage url.
 */
export function assertCloudStorageUrl(url: string): void {
  _assert(isCloudStorageUrl(url), `Cloud Storage url should start with gs:// but got: ${url}`)
}

/**
 * Returns true for a Cloud Storage url: `gs://bucket/path/to/file`.
 */
export function isCloudStorageUrl(path: string): boolean {
  return path.startsWith(CLOUD_STORAGE_URL_PREFIX)
}

async function getDefaultCloudStorage(): Promise<DefaultCloudStorage> {
  const lib = await importCloudStorageLib()
  return await lib.getDefaultCloudStorage()
}

/**
 * cloud-storage-lib is an optional peer dependency, so it is imported lazily,
 * only when a `gs://` url is actually used.
 */
async function importCloudStorageLib(): Promise<CloudStorageLib> {
  try {
    // The package name is passed as a variable, so that TypeScript does not resolve this import,
    // see the comment at CloudStorageLib
    return await import(CLOUD_STORAGE_LIB)
  } catch (err) {
    const { code, message } = err as NodeJS.ErrnoException
    // The message names the missing package in quotes. If it names another package -
    // cloud-storage-lib is installed, and one of its own imports is missing.
    if (code !== 'ERR_MODULE_NOT_FOUND' || !message.includes(`'${CLOUD_STORAGE_LIB}'`)) throw err

    throw new Error(
      [
        `Reading from and writing to gs:// urls requires ${CLOUD_STORAGE_LIB}.`,
        'It is an optional peer dependency of @naturalcycles/nodejs-lib, and it is not installed.',
        `Install it with: pnpm add ${CLOUD_STORAGE_LIB}`,
      ].join('\n'),
      { cause: err },
    )
  }
}

interface CloudStorageUrl {
  bucketName: string
  filePath: string
}

/**
 * The part of `@naturalcycles/cloud-storage-lib` that is used here.
 *
 * It is declared here, and not imported from there, because cloud-storage-lib depends on nodejs-lib.
 * Its types resolve to the `dist` folder of nodejs-lib, which would then be both an input and the output
 * of the nodejs-lib build: "Cannot write file ... because it would overwrite input file".
 */
interface CloudStorageLib {
  getDefaultCloudStorage: () => Promise<DefaultCloudStorage>
}

/**
 * The part of `CommonStorage` that is used here.
 */
interface DefaultCloudStorage {
  /**
   * Returns a `Pipeline<Uint8Array>`.
   */
  getFileReadStream: (bucketName: string, filePath: string) => PipelineTo
  getFileWriteStream: (bucketName: string, filePath: string) => WritableTyped<Uint8Array>
}

interface PipelineTo {
  to: (destination: Writable) => Promise<void>
}
