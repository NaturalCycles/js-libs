import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { _noop } from '@naturalcycles/js-lib/types'
import { beforeEach, test, vi } from 'vitest'
import { scriptsDir, testDir, tmpDir } from '../test/paths.cnst.js'
import { json2env } from './json2env.js'
import { kpy, kpySync } from './kpy.js'

beforeEach(() => {
  vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
  vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {})
  vi.spyOn(fs, 'mkdirSync').mockImplementation(_noop as any)
  vi.spyOn(fs, 'copyFileSync').mockImplementation(() => {})
  vi.spyOn(fs, 'renameSync').mockImplementation(() => {})
  vi.spyOn(fs, 'rmSync').mockImplementation(() => {})
  // vi.spyOn(fse, 'copySync').mockImplementation(() => {})
  vi.spyOn(fs, 'cpSync').mockImplementation(() => {})
  vi.spyOn(fs, 'rename').mockImplementation(() => {})
  vi.spyOn(fsp, 'rename').mockImplementation(_noop as any)
  vi.spyOn(fsp, 'mkdir').mockImplementation(_noop as any)
  vi.spyOn(fsp, 'cp').mockImplementation(_noop as any)
  vi.spyOn(fsp, 'copyFile').mockImplementation(_noop as any)
  vi.spyOn(fsp, 'unlink').mockImplementation(_noop as any)
  vi.spyOn(fsp, 'rm').mockImplementation(_noop as any)
})

const outputDir = `${tmpDir}/debug/kpy`
const inputPatterns = ['*.json']

test('kpy', async () => {
  kpySync({
    baseDir: scriptsDir,
    outputDir,
    inputPatterns,
  })

  // Trying different options for coverage
  kpySync({
    baseDir: scriptsDir,
    outputDir,
    verbose: true,
    flat: true,
  })

  kpySync({
    baseDir: scriptsDir,
    outputDir,
    silent: true,
    move: true,
  })

  await kpy({
    baseDir: scriptsDir,
    outputDir,
    silent: true,
  })

  await kpy({
    baseDir: scriptsDir,
    outputDir,
    dry: true,
    verbose: true,
    flat: true,
  })

  await kpy({
    baseDir: scriptsDir,
    outputDir,
    move: true,
    silent: true,
  })

  // kpySync({
  //   // for coverage
  //   baseDir: undefined as any,
  //   outputDir: undefined as any,
  //   dry: true,
  // })
})

test('json2env', async () => {
  const jsonPath = `${testDir}/someFile.json`

  json2env({
    jsonPath,
  })

  // Different options for coverage
  json2env({
    jsonPath,
    debug: true,
    saveEnvFile: false,
  })
})
