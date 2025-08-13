/*

Why?

Convenience re-export/re-implementation of most common fs functions from
node:fs, node:fs/promises and fs-extra

Defaults to string input/output, as it's used in 80% of time. For the rest - you can use native fs.

Allows to import it easier, so you don't have to choose between the 3 import locations.
That's why function names are slightly renamed, to avoid conflict.

Credit to: fs-extra (https://github.com/jprichardson/node-fs-extra)

 */

import type { RmOptions, Stats } from 'node:fs'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { _jsonParse } from '@naturalcycles/js-lib/string/json.util.js'

/**
 * fs2 conveniently groups filesystem functions together.
 * Supposed to be almost a drop-in replacement for these things together:
 *
 * 1. node:fs
 * 2. node:fs/promises
 * 3. fs-extra
 */
class FS2 {
  // Naming convention is:
  // - async function has Async in the name, e.g readTextAsync
  // - sync function has postfix in the name, e.g readText

  /**
   * Convenience wrapper that defaults to utf-8 string output.
   */
  readText(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8')
  }

  /**
   * Convenience wrapper that defaults to utf-8 string output.
   */
  async readTextAsync(filePath: string): Promise<string> {
    return await fsp.readFile(filePath, 'utf8')
  }

  readBuffer(filePath: string): Buffer {
    return fs.readFileSync(filePath)
  }

  async readBufferAsync(filePath: string): Promise<Buffer> {
    return await fsp.readFile(filePath)
  }

  readJson<T = unknown>(filePath: string): T {
    const str = fs.readFileSync(filePath, 'utf8')
    return _jsonParse(str)
  }

  async readJsonAsync<T = unknown>(filePath: string): Promise<T> {
    const str = await fsp.readFile(filePath, 'utf8')
    // eslint-disable-next-line @typescript-eslint/return-await
    return _jsonParse(str)
  }

  writeFile(filePath: string, data: string | Buffer): void {
    fs.writeFileSync(filePath, data)
  }

  async writeFileAsync(filePath: string, data: string | Buffer): Promise<void> {
    await fsp.writeFile(filePath, data)
  }

  writeJson(filePath: string, data: any, opt?: JsonOptions): void {
    const str = stringify(data, opt)
    fs.writeFileSync(filePath, str)
  }

  async writeJsonAsync(filePath: string, data: any, opt?: JsonOptions): Promise<void> {
    const str = stringify(data, opt)
    await fsp.writeFile(filePath, str)
  }

  appendFile(filePath: string, data: string | Buffer): void {
    fs.appendFileSync(filePath, data)
  }

  async appendFileAsync(filePath: string, data: string | Buffer): Promise<void> {
    await fsp.appendFile(filePath, data)
  }

  outputJson(filePath: string, data: any, opt?: JsonOptions): void {
    const str = stringify(data, opt)
    this.outputFile(filePath, str)
  }

  async outputJsonAsync(filePath: string, data: any, opt?: JsonOptions): Promise<void> {
    const str = stringify(data, opt)
    await this.outputFileAsync(filePath, str)
  }

  outputFile(filePath: string, data: string | Buffer): void {
    const dirPath = path.dirname(filePath)
    if (!fs.existsSync(dirPath)) {
      this.ensureDir(dirPath)
    }

    fs.writeFileSync(filePath, data)
  }

  async outputFileAsync(filePath: string, data: string | Buffer): Promise<void> {
    const dirPath = path.dirname(filePath)
    if (!(await this.pathExistsAsync(dirPath))) {
      await this.ensureDirAsync(dirPath)
    }

    await fsp.writeFile(filePath, data)
  }

  pathExists(filePath: string): boolean {
    return fs.existsSync(filePath)
  }

  async pathExistsAsync(filePath: string): Promise<boolean> {
    try {
      await fsp.access(filePath)
      return true
    } catch {
      return false
    }
  }

  requireFileToExist(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required file should exist: ${filePath}`)
    }
  }

  ensureDir(dirPath: string): void {
    fs.mkdirSync(dirPath, {
      mode: 0o777,
      recursive: true,
    })
  }

  async ensureDirAsync(dirPath: string): Promise<void> {
    await fsp.mkdir(dirPath, {
      mode: 0o777,
      recursive: true,
    })
  }

  ensureFile(filePath: string): void {
    let stats: Stats | undefined
    try {
      stats = fs.statSync(filePath)
    } catch {}
    if (stats?.isFile()) return

    const dir = path.dirname(filePath)
    try {
      if (!fs.statSync(dir).isDirectory()) {
        // parent is not a directory
        // This is just to cause an internal ENOTDIR error to be thrown
        fs.readdirSync(dir)
      }
    } catch (err) {
      // If the stat call above failed because the directory doesn't exist, create it
      if ((err as any)?.code === 'ENOENT') {
        this.ensureDir(dir)
        return
      }
      throw err
    }

    fs.writeFileSync(filePath, '')
  }

  async ensureFileAsync(filePath: string): Promise<void> {
    let stats: Stats | undefined
    try {
      stats = await fsp.stat(filePath)
    } catch {}
    if (stats?.isFile()) return

    const dir = path.dirname(filePath)
    try {
      if (!(await fsp.stat(dir)).isDirectory()) {
        // parent is not a directory
        // This is just to cause an internal ENOTDIR error to be thrown
        await fsp.readdir(dir)
      }
    } catch (err) {
      // If the stat call above failed because the directory doesn't exist, create it
      if ((err as any)?.code === 'ENOENT') return await this.ensureDirAsync(dir)
      throw err
    }

    await fsp.writeFile(filePath, '')
  }

  removePath(fileOrDirPath: string, opt?: RmOptions): void {
    fs.rmSync(fileOrDirPath, { recursive: true, force: true, ...opt })
  }

  async removePathAsync(fileOrDirPath: string, opt?: RmOptions): Promise<void> {
    await fsp.rm(fileOrDirPath, { recursive: true, force: true, ...opt })
  }

  emptyDir(dirPath: string): void {
    let items: string[]
    try {
      items = fs.readdirSync(dirPath)
    } catch {
      this.ensureDir(dirPath)
      return
    }

    for (const item of items) {
      this.removePath(path.join(dirPath, item))
    }
  }

  async emptyDirAsync(dirPath: string): Promise<void> {
    let items: string[]
    try {
      items = await fsp.readdir(dirPath)
    } catch {
      return await this.ensureDirAsync(dirPath)
    }

    await Promise.all(items.map(item => this.removePathAsync(path.join(dirPath, item))))
  }

  /**
   * Cautious, underlying Node function is currently Experimental.
   */
  copyPath(src: string, dest: string, opt?: fs.CopySyncOptions): void {
    fs.cpSync(src, dest, {
      recursive: true,
      ...opt,
    })
  }

  /**
   * Cautious, underlying Node function is currently Experimental.
   */
  async copyPathAsync(src: string, dest: string, opt?: fs.CopyOptions): Promise<void> {
    await fsp.cp(src, dest, {
      recursive: true,
      ...opt,
    })
  }

  renamePath(src: string, dest: string): void {
    fs.renameSync(src, dest)
  }

  async renamePathAsync(src: string, dest: string): Promise<void> {
    await fsp.rename(src, dest)
  }

  movePath(src: string, dest: string, opt?: fs.CopySyncOptions): void {
    this.copyPath(src, dest, opt)
    this.removePath(src)
  }

  async movePathAsync(src: string, dest: string, opt?: fs.CopyOptions): Promise<void> {
    await this.copyPathAsync(src, dest, opt)
    await this.removePathAsync(src)
  }

  /**
   * Returns true if the path is a directory.
   * Otherwise returns false.
   * Doesn't throw, returns false instead.
   */
  isDirectory(filePath: string): boolean {
    return (
      fs2
        .stat(filePath, {
          throwIfNoEntry: false,
        })
        ?.isDirectory() || false
    )
  }

  // Re-export the whole fs/fsp, for the edge cases where they are needed
  fs = fs
  fsp = fsp

  // Re-export existing fs/fsp functions
  // rm/rmAsync are replaced with removePath/removePathAsync
  lstat = fs.lstatSync
  lstatAsync = fsp.lstat
  stat = fs.statSync
  statAsync = fsp.stat
  mkdir = fs.mkdirSync
  mkdirAsync = fsp.mkdir
  readdir = fs.readdirSync
  readdirAsync = fsp.readdir
  createWriteStream = fs.createWriteStream
  createReadStream = fs.createReadStream
}

export const fs2 = new FS2()

export interface JsonOptions {
  spaces?: number
}

function stringify(data: any, opt?: JsonOptions): string {
  // If pretty-printing is enabled (spaces) - also add a newline at the end (to match our prettier config)
  return JSON.stringify(data, null, opt?.spaces) + (opt?.spaces ? '\n' : '')
}
