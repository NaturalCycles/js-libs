import type { LocalTimeInput } from '@naturalcycles/js-lib'
import type { ReadableBinary, ReadableTyped, WritableBinary } from '@naturalcycles/nodejs-lib'

export interface FileEntry {
  filePath: string
  content: Buffer
}

// TODO: move it away to a separate repo

export interface CommonStorageGetOptions {
  /**
   * Will filter resulting files based on `prefix`.
   */
  prefix?: string

  /**
   * Defaults to true.
   * Set to false to return file names instead of full paths.
   */
  fullPaths?: boolean

  /**
   * Limits the number of results.
   *
   * By default it's unlimited.
   *
   * 0 is treated as `undefined`.
   */
  limit?: number
}

/**
 * Common denominator interface for File Storage.
 * Modelled after GCP Cloud Storage, Firebase Storage.
 *
 * Uses the concept of Bucket (identified by string name) and Path within the Bucket.
 *
 * Path MUST NOT start with a slash !
 *
 * Similarly to CommonDB, Bucket is like a Table, and Path is like an `id`.
 */
export interface CommonStorage {
  /**
   * Ensure that the credentials are correct and the connection is working.
   * Idempotent.
   *
   * Pass `bucketName` in case you only have permissions to operate on that bucket.
   */
  ping: (bucketName?: string) => Promise<void>

  /**
   * Creates a new bucket by given name.
   * todo: check what to do if it already exists
   */
  // createBucket(bucketName: string): Promise<void>

  fileExists: (bucketName: string, filePath: string) => Promise<boolean>

  getFile: (bucketName: string, filePath: string) => Promise<Buffer | null>

  saveFile: (bucketName: string, filePath: string, content: Buffer) => Promise<void>

  /**
   * Should recursively delete all files in a folder, if path is a folder.
   */
  deletePath: (bucketName: string, prefix: string) => Promise<void>

  deletePaths: (bucketName: string, prefixes: string[]) => Promise<void>

  /**
   * Should delete all files by their paths.
   */
  deleteFiles: (bucketName: string, filePaths: string[]) => Promise<void>

  /**
   * Returns an array of strings which are file paths.
   * Files that are not found by the path are not present in the map.
   *
   * Second argument is called `prefix` (same as `path`) to explain how
   * listing works (it filters all files by `startsWith`). Also, to match
   * GCP Cloud Storage API.
   *
   * Important difference between `prefix` and `path` is that `prefix` will
   * return all files from sub-directories too!
   */
  getFileNames: (bucketName: string, opt?: CommonStorageGetOptions) => Promise<string[]>

  getFileNamesStream: (bucketName: string, opt?: CommonStorageGetOptions) => ReadableTyped<string>

  getFilesStream: (bucketName: string, opt?: CommonStorageGetOptions) => ReadableTyped<FileEntry>

  getFileReadStream: (bucketName: string, filePath: string) => ReadableBinary

  getFileWriteStream: (bucketName: string, filePath: string) => WritableBinary

  /**
   * Upload local file to the bucket (by streaming it).
   */
  uploadFile: (localFilePath: string, bucketName: string, bucketFilePath: string) => Promise<void>

  setFileVisibility: (bucketName: string, filePath: string, isPublic: boolean) => Promise<void>

  getFileVisibility: (bucketName: string, filePath: string) => Promise<boolean>

  copyFile: (
    fromBucket: string,
    fromPath: string,
    toPath: string,
    toBucket?: string,
  ) => Promise<void>

  moveFile: (
    fromBucket: string,
    fromPath: string,
    toPath: string,
    toBucket?: string,
  ) => Promise<void>

  /**
   * Allows to move "directory" with all its contents.
   *
   * Prefixes should end with `/` to work properly,
   * otherwise some folder that starts with the same prefix will be included.
   */
  movePath: (
    fromBucket: string,
    fromPrefix: string,
    toPrefix: string,
    toBucket?: string,
  ) => Promise<void>

  /**
   * Combine (compose) multiple input files into a single output file.
   * Should support unlimited number of input files, using recursive algorithm if necessary.
   *
   * After the output file is created, all input files should be deleted.
   *
   * @experimental
   */
  combineFiles: (
    bucketName: string,
    filePaths: string[],
    toPath: string,
    toBucket?: string,
  ) => Promise<void>

  /**
   * Like `combineFiles`, but for a `prefix`.
   */
  combine: (bucketName: string, prefix: string, toPath: string, toBucket?: string) => Promise<void>

  /**
   * Acquire a "signed url", which allows bearer to use it to download ('read') the file.
   *
   * @experimental
   */
  getSignedUrl: (bucketName: string, filePath: string, expires: LocalTimeInput) => Promise<string>
}
