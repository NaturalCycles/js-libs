import fs from 'node:fs'
import { globSync } from 'tinyglobby'
import { expect, it } from 'vitest'
import { fs2 } from '../fs/fs2.js'
import { secretDir, tmpDir } from '../test/paths.cnst.js'
import { TEST_ENC_KEY } from '../test/test.cnst.js'
import { secretsDecrypt } from './secrets-decrypt.util.js'
import { secretsEncrypt } from './secrets-encrypt.util.js'

const encKeyBuffer = Buffer.from(TEST_ENC_KEY, 'base64')

const plainFiles = [
  'secret1.json',
  'secret2.json',
  'secret3.txt',
  'sub/secret1.json',
  'sub2/secret1.json',
]
const encFiles = plainFiles.map(file => `${file}.enc`)

it('should decrypt a secrets dir and encrypt it back, deleting the source files with del', () => {
  fs2.ensureDir(tmpDir)
  // Under the cwd, like the default `./secret/**` pattern: `!**/*.enc` doesn't exclude paths outside it
  const dir = fs.mkdtempSync(`${tmpDir}/secrets-`)
  try {
    fs2.copyPath(secretDir, dir)

    secretsDecrypt([dir], undefined, encKeyBuffer)
    expect(listFiles(dir)).toEqual([...plainFiles, ...encFiles].sort())
    expectPlainContent(dir)

    secretsDecrypt([dir], undefined, encKeyBuffer, true)
    expect(listFiles(dir)).toEqual(plainFiles)
    expectPlainContent(dir)

    secretsEncrypt([`${dir}/**`], undefined, encKeyBuffer)
    expect(listFiles(dir)).toEqual([...plainFiles, ...encFiles].sort())

    secretsEncrypt([`${dir}/**`], undefined, encKeyBuffer, true)
    expect(listFiles(dir)).toEqual(encFiles)

    secretsDecrypt([dir], undefined, encKeyBuffer)
    expectPlainContent(dir)
  } finally {
    fs2.removePath(dir)
  }
})

function expectPlainContent(dir: string): void {
  expect(fs2.readJson(`${dir}/secret1.json`)).toEqual({ very: 'secret' })
  expect(fs2.readJson(`${dir}/secret2.json`)).toEqual({ also: 'secret' })
  expect(fs2.readText(`${dir}/secret3.txt`)).toBe('very secret\n')
  expect(fs2.readJson(`${dir}/sub/secret1.json`)).toEqual({ very: 'secret' })
}

function listFiles(dir: string): string[] {
  return globSync('**', { cwd: dir }).sort()
}
