import fs from 'node:fs'
import { expect, it } from 'vitest'
import { testDir } from '../test/paths.cnst.js'
import { fs2 } from './fs2.js'

it('readFile', async () => {
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

  fs2.ensureDir(testDir)
  await fs2.ensureDirAsync(testDir)
  fs2.ensureFile(someFilePath)
  await fs2.ensureFileAsync(someFilePath)
})

it('extends native fs', () => {
  expect(fs2.createWriteStream).toBe(fs.createWriteStream)
})
