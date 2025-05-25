import type { Readable, Writable } from 'node:stream'
import { AppError, pMap } from '@naturalcycles/js-lib'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib'
import type { CommonStorage, CommonStorageGetOptions, FileEntry } from './commonStorage.js'

export interface CommonStorageBucketCfg {
  storage: CommonStorage
  bucketName: string
}

/**
 * Convenience wrapper around CommonStorage for a given Bucket.
 *
 * Similar to what CommonDao is to CommonDB.
 */
export class CommonStorageBucket {
  constructor(public cfg: CommonStorageBucketCfg) {}

  async ping(bucketName?: string): Promise<void> {
    await this.cfg.storage.ping(bucketName)
  }

  async fileExists(filePath: string): Promise<boolean> {
    return await this.cfg.storage.fileExists(this.cfg.bucketName, filePath)
  }

  async getFile(filePath: string): Promise<Buffer | null> {
    return await this.cfg.storage.getFile(this.cfg.bucketName, filePath)
  }

  async getFileAsString(filePath: string): Promise<string | null> {
    const buf = await this.cfg.storage.getFile(this.cfg.bucketName, filePath)
    return buf?.toString() || null
  }

  async getFileAsJson<T = any>(filePath: string): Promise<T | null> {
    const buf = await this.cfg.storage.getFile(this.cfg.bucketName, filePath)
    if (!buf) return null
    return JSON.parse(buf.toString())
  }

  async requireFile(filePath: string): Promise<Buffer> {
    const buf = await this.cfg.storage.getFile(this.cfg.bucketName, filePath)
    if (!buf) this.throwRequiredError(filePath)
    return buf
  }

  async requireFileAsString(filePath: string): Promise<string> {
    const s = await this.getFileAsString(filePath)
    return s ?? this.throwRequiredError(filePath)
  }

  async requireFileAsJson<T = any>(filePath: string): Promise<T> {
    const v = await this.getFileAsJson<T>(filePath)
    return v ?? this.throwRequiredError(filePath)
  }

  private throwRequiredError(filePath: string): never {
    throw new AppError(`File required, but not found: ${this.cfg.bucketName}/${filePath}`, {
      code: 'FILE_REQUIRED',
    })
  }

  async getFileContents(paths: string[]): Promise<Buffer[]> {
    return (
      await pMap(
        paths,
        async filePath => (await this.cfg.storage.getFile(this.cfg.bucketName, filePath))!,
      )
    ).filter(Boolean)
  }

  async getFileContentsAsJson<T = any>(paths: string[]): Promise<T[]> {
    return (
      await pMap(paths, async filePath => {
        const buf = await this.cfg.storage.getFile(this.cfg.bucketName, filePath)
        return buf ? JSON.parse(buf.toString()) : null
      })
    ).filter(Boolean)
  }

  async getFileEntries(paths: string[]): Promise<FileEntry[]> {
    return (
      await pMap(paths, async filePath => {
        const content = await this.cfg.storage.getFile(this.cfg.bucketName, filePath)
        return { filePath, content: content! }
      })
    ).filter(f => f.content)
  }

  async getFileEntriesAsJson<T = any>(
    paths: string[],
  ): Promise<{ filePath: string; content: T }[]> {
    return (
      await pMap(paths, async filePath => {
        const buf = await this.cfg.storage.getFile(this.cfg.bucketName, filePath)
        return buf ? { filePath, content: JSON.parse(buf.toString()) } : (null as any)
      })
    ).filter(Boolean)
  }

  async saveFile(filePath: string, content: Buffer): Promise<void> {
    await this.cfg.storage.saveFile(this.cfg.bucketName, filePath, content)
  }

  /**
   * Convenience method that does:
   * await saveFile
   * await setFileVisibility
   */
  async savePublicFile(filePath: string, content: Buffer): Promise<void> {
    await this.cfg.storage.saveFile(this.cfg.bucketName, filePath, content)
    await this.cfg.storage.setFileVisibility(this.cfg.bucketName, filePath, true)
  }

  async saveStringFile(filePath: string, content: string): Promise<void> {
    await this.cfg.storage.saveFile(this.cfg.bucketName, filePath, Buffer.from(content))
  }

  async saveJsonFile(filePath: string, content: any): Promise<void> {
    await this.cfg.storage.saveFile(
      this.cfg.bucketName,
      filePath,
      Buffer.from(JSON.stringify(content)),
    )
  }

  async saveFiles(entries: FileEntry[]): Promise<void> {
    await pMap(entries, async f => {
      await this.cfg.storage.saveFile(this.cfg.bucketName, f.filePath, f.content)
    })
  }

  /**
   * Should recursively delete all files in a folder, if path is a folder.
   */
  async deletePath(prefix: string): Promise<void> {
    return await this.cfg.storage.deletePath(this.cfg.bucketName, prefix)
  }

  async deletePaths(prefixes: string[]): Promise<void> {
    await pMap(prefixes, async prefix => {
      return await this.cfg.storage.deletePath(this.cfg.bucketName, prefix)
    })
  }

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
  async getFileNames(opt?: CommonStorageGetOptions): Promise<string[]> {
    return await this.cfg.storage.getFileNames(this.cfg.bucketName, opt)
  }

  getFileNamesStream(opt?: CommonStorageGetOptions): ReadableTyped<string> {
    return this.cfg.storage.getFileNamesStream(this.cfg.bucketName, opt)
  }

  getFilesStream(opt?: CommonStorageGetOptions): ReadableTyped<FileEntry> {
    return this.cfg.storage.getFilesStream(this.cfg.bucketName, opt)
  }

  getFileReadStream(filePath: string): Readable {
    return this.cfg.storage.getFileReadStream(this.cfg.bucketName, filePath)
  }

  getFileWriteStream(filePath: string): Writable {
    return this.cfg.storage.getFileWriteStream(this.cfg.bucketName, filePath)
  }

  async setFileVisibility(filePath: string, isPublic: boolean): Promise<void> {
    await this.cfg.storage.setFileVisibility(this.cfg.bucketName, filePath, isPublic)
  }

  async getFileVisibility(filePath: string): Promise<boolean> {
    return await this.cfg.storage.getFileVisibility(this.cfg.bucketName, filePath)
  }

  async copyFile(fromPath: string, toPath: string, toBucket?: string): Promise<void> {
    await this.cfg.storage.copyFile(this.cfg.bucketName, fromPath, toPath, toBucket)
  }

  async moveFile(fromPath: string, toPath: string, toBucket?: string): Promise<void> {
    await this.cfg.storage.moveFile(this.cfg.bucketName, fromPath, toPath, toBucket)
  }
}
