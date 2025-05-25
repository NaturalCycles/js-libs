import type { LocalTimeInput, StringMap } from '@naturalcycles/js-lib'
import {
  _assert,
  _isTruthy,
  _stringMapEntries,
  _substringAfterLast,
  localTime,
} from '@naturalcycles/js-lib'
import type { ReadableBinary, ReadableTyped, WritableBinary } from '@naturalcycles/nodejs-lib'
import { fs2, md5, readableFrom } from '@naturalcycles/nodejs-lib'
import type { CommonStorage, CommonStorageGetOptions, FileEntry } from './commonStorage.js'

export class InMemoryCommonStorage implements CommonStorage {
  /**
   * data[bucketName][filePath] = Buffer
   */
  data: StringMap<StringMap<Buffer>> = {}

  publicMap: StringMap<StringMap<boolean>> = {}

  async ping(): Promise<void> {}

  async getBucketNames(): Promise<string[]> {
    return Object.keys(this.data)
  }

  getBucketNamesStream(): ReadableTyped<string> {
    return readableFrom(Object.keys(this.data))
  }

  async fileExists(bucketName: string, filePath: string): Promise<boolean> {
    return !!this.data[bucketName]?.[filePath]
  }

  async getFile(bucketName: string, filePath: string): Promise<Buffer | null> {
    return this.data[bucketName]?.[filePath] || null
  }

  async saveFile(bucketName: string, filePath: string, content: Buffer): Promise<void> {
    this.data[bucketName] ||= {}
    this.data[bucketName][filePath] = content
  }

  async deletePath(bucketName: string, prefix: string): Promise<void> {
    await this.deletePaths(bucketName, [prefix])
  }

  async deletePaths(bucketName: string, prefixes: string[]): Promise<void> {
    Object.keys(this.data[bucketName] || {}).forEach(filePath => {
      if (prefixes.some(prefix => filePath.startsWith(prefix))) {
        delete this.data[bucketName]![filePath]
      }
    })
  }

  async deleteFiles(bucketName: string, filePaths: string[]): Promise<void> {
    if (!this.data[bucketName]) return
    filePaths.forEach(filePath => delete this.data[bucketName]![filePath])
  }

  async getFileNames(bucketName: string, opt: CommonStorageGetOptions = {}): Promise<string[]> {
    const { prefix = '', fullPaths = true } = opt
    return Object.keys(this.data[bucketName] || {})
      .filter(filePath => filePath.startsWith(prefix))
      .map(f => (fullPaths ? f : _substringAfterLast(f, '/')))
  }

  getFileNamesStream(bucketName: string, opt: CommonStorageGetOptions = {}): ReadableTyped<string> {
    const { prefix = '', fullPaths = true } = opt

    return readableFrom(
      Object.keys(this.data[bucketName] || {})
        .filter(filePath => filePath.startsWith(prefix))
        .slice(0, opt.limit)
        .map(n => (fullPaths ? n : _substringAfterLast(n, '/'))),
    )
  }

  getFilesStream(bucketName: string, opt: CommonStorageGetOptions = {}): ReadableTyped<FileEntry> {
    const { prefix = '', fullPaths = true } = opt

    return readableFrom(
      _stringMapEntries(this.data[bucketName] || {})
        .map(([filePath, content]) => ({
          filePath,
          content,
        }))
        .filter(f => f.filePath.startsWith(prefix))
        .slice(0, opt.limit)
        .map(f => (fullPaths ? f : { ...f, filePath: _substringAfterLast(f.filePath, '/') })),
    )
  }

  getFileReadStream(bucketName: string, filePath: string): ReadableBinary {
    return readableFrom(this.data[bucketName]![filePath]!)
  }

  getFileWriteStream(_bucketName: string, _filePath: string): WritableBinary {
    throw new Error('Method not implemented.')
  }

  async uploadFile(
    localFilePath: string,
    bucketName: string,
    bucketFilePath: string,
  ): Promise<void> {
    this.data[bucketName] ||= {}
    this.data[bucketName][bucketFilePath] = await fs2.readBufferAsync(localFilePath)
  }

  async setFileVisibility(bucketName: string, filePath: string, isPublic: boolean): Promise<void> {
    this.publicMap[bucketName] ||= {}
    this.publicMap[bucketName][filePath] = isPublic
  }

  async getFileVisibility(bucketName: string, filePath: string): Promise<boolean> {
    return !!this.publicMap[bucketName]?.[filePath]
  }

  async copyFile(
    fromBucket: string,
    fromPath: string,
    toPath: string,
    toBucket?: string,
  ): Promise<void> {
    const tob = toBucket || fromBucket
    this.data[fromBucket] ||= {}
    this.data[tob] ||= {}
    this.data[tob][toPath] = this.data[fromBucket][fromPath]
  }

  async moveFile(
    fromBucket: string,
    fromPath: string,
    toPath: string,
    toBucket?: string,
  ): Promise<void> {
    const tob = toBucket || fromBucket
    this.data[fromBucket] ||= {}
    this.data[tob] ||= {}
    this.data[tob][toPath] = this.data[fromBucket][fromPath]
    delete this.data[fromBucket][fromPath]
  }

  async movePath(
    fromBucket: string,
    fromPrefix: string,
    toPrefix: string,
    toBucket?: string,
  ): Promise<void> {
    const tob = toBucket || fromBucket
    this.data[fromBucket] ||= {}
    this.data[tob] ||= {}

    _stringMapEntries(this.data[fromBucket]).forEach(([filePath, v]) => {
      if (!filePath.startsWith(fromPrefix)) return
      this.data[tob]![toPrefix + filePath.slice(fromPrefix.length)] = v
      delete this.data[fromBucket]![filePath]
    })
  }

  async combine(
    bucketName: string,
    prefix: string,
    toPath: string,
    toBucket?: string,
  ): Promise<void> {
    const filePaths = await this.getFileNames(bucketName, { prefix })
    await this.combineFiles(bucketName, filePaths, toPath, toBucket)
  }

  async combineFiles(
    bucketName: string,
    filePaths: string[],
    toPath: string,
    toBucket?: string,
  ): Promise<void> {
    if (!this.data[bucketName]) return
    const tob = toBucket || bucketName
    this.data[tob] ||= {}
    this.data[tob][toPath] = Buffer.concat(
      filePaths.map(p => this.data[bucketName]![p]).filter(_isTruthy),
    )

    // delete source files
    filePaths.forEach(p => delete this.data[bucketName]![p])
  }

  async getSignedUrl(
    bucketName: string,
    filePath: string,
    expires: LocalTimeInput,
  ): Promise<string> {
    const buf = this.data[bucketName]?.[filePath]
    _assert(buf, `getSignedUrl file not found: ${bucketName}/${filePath}`)
    const signature = md5(buf)
    return `https://testurl.com/${bucketName}/${filePath}?expires=${localTime(expires).unix}&signature=${signature}`
  }
}
