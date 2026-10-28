import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'
import { testDir } from '../test/paths.cnst.js'
import { fs2 } from './fs2.js'

it('should read text and JSON and tell whether a path exists, sync and async', async () => {
  const someFilePath = `${testDir}/someFile.json`

  let r = fs2.readText(someFilePath)
  expect(r).toContain('aaa')
  r = await fs2.readTextAsync(someFilePath)
  expect(r).toContain('aaa')

  let o = fs2.readJson(someFilePath)
  expect(o).toMatchInlineSnapshot(`
    {
      "a": "aaa",
      "b": "bbb",
    }
  `)
  o = await fs2.readJsonAsync(someFilePath)
  expect(o).toMatchInlineSnapshot(`
    {
      "a": "aaa",
      "b": "bbb",
    }
  `)

  expect(fs2.pathExists(testDir)).toBe(true)
  expect(await fs2.pathExistsAsync(testDir)).toBe(true)
  expect(fs2.pathExists(`${testDir}/missing`)).toBe(false)
  expect(await fs2.pathExistsAsync(`${testDir}/missing`)).toBe(false)
})

it('should create missing dirs with ensureDir, and empty files without overwriting existing ones with ensureFile, sync and async', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs2-'))
  try {
    fs2.ensureDir(`${dir}/a/b`)
    await fs2.ensureDirAsync(`${dir}/c/d`)
    expect(fs2.isDirectory(`${dir}/a/b`)).toBe(true)
    expect(fs2.isDirectory(`${dir}/c/d`)).toBe(true)

    fs2.ensureFile(`${dir}/a/b/new.txt`)
    await fs2.ensureFileAsync(`${dir}/c/d/new.txt`)
    expect(fs2.readText(`${dir}/a/b/new.txt`)).toBe('')
    expect(fs2.readText(`${dir}/c/d/new.txt`)).toBe('')

    fs2.writeFile(`${dir}/existing.txt`, 'content')
    fs2.ensureFile(`${dir}/existing.txt`)
    await fs2.ensureFileAsync(`${dir}/existing.txt`)
    expect(fs2.readText(`${dir}/existing.txt`)).toBe('content')
  } finally {
    fs2.removePath(dir)
  }
})

it('should expose native fs functions such as createWriteStream', () => {
  expect(fs2.createWriteStream).toBe(fs.createWriteStream)
})
