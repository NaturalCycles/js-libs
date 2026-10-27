import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { globSync } from 'tinyglobby'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testDir } from '../test/paths.cnst.js'
import { fs2 } from './fs2.js'
import { json2env } from './json2env.js'
import type { KpyOptions } from './kpy.js'
import { kpy, kpySync } from './kpy.js'

const inputFiles = ['a.json', 'b.txt', 'sub/c.json']

let tmpDir: string
let baseDir: string
let outputDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kpy-'))
  baseDir = `${tmpDir}/in`
  outputDir = `${tmpDir}/out`
  inputFiles.forEach(file => fs2.outputFile(`${baseDir}/${file}`, file))
})

afterEach(() => {
  fs2.removePath(tmpDir)
})

describe.each([
  ['kpySync', async (opt: KpyOptions) => kpySync(opt)],
  ['kpy', kpy],
])('%s', (_name, kpyFn) => {
  it('should copy only the files matching inputPatterns', async () => {
    await kpyFn({ baseDir, outputDir, inputPatterns: ['*.json'], silent: true })

    expect(listFiles(outputDir)).toEqual(['a.json'])
    expect(fs2.readText(`${outputDir}/a.json`)).toBe('a.json')
    expect(listFiles(baseDir)).toEqual(inputFiles)
  })

  it('should copy all files into the output dir root with flat', async () => {
    await kpyFn({ baseDir, outputDir, flat: true, verbose: true })

    expect(listFiles(outputDir)).toEqual(['a.json', 'b.txt', 'c.json'])
    expect(fs2.readText(`${outputDir}/c.json`)).toBe('sub/c.json')
  })

  it('should move the files with move', async () => {
    await kpyFn({ baseDir, outputDir, move: true, silent: true })

    expect(listFiles(outputDir)).toEqual(inputFiles)
    expect(listFiles(baseDir)).toEqual([])
  })

  it('should copy nothing with dry', async () => {
    await kpyFn({ baseDir, outputDir, dry: true, verbose: true })

    expect(listFiles(outputDir)).toEqual([])
    expect(listFiles(baseDir)).toEqual(inputFiles)
  })
})

it('should write the JSON file as shell exports next to it, unless saveEnvFile is false', async () => {
  // CI runners set these, and json2env appends to them too
  vi.stubEnv('BASH_ENV', '')
  vi.stubEnv('GITHUB_ENV', '')
  vi.stubEnv('GITHUB_OUTPUT', '')
  vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
  const jsonPath = `${testDir}/someFile.json`

  json2env({
    jsonPath,
  })

  expect(fs.writeFileSync).toHaveBeenCalledExactlyOnceWith(
    `${jsonPath}.sh`,
    'export a="aaa"\nexport b="bbb"\n',
    undefined,
  )

  json2env({
    jsonPath,
    debug: true,
    saveEnvFile: false,
  })

  expect(fs.writeFileSync).toHaveBeenCalledOnce()
})

function listFiles(dir: string): string[] {
  return globSync('**', { cwd: dir }).sort()
}
