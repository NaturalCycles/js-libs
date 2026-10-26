import { expect, it } from 'vitest'
import { loadEnvFileIfExists } from './node.util.js'
import { testDir } from './test/paths.cnst.js'

it('loadEnvFileIfExists returns false for non-existing file', () => {
  expect(loadEnvFileIfExists('.env.non-existing')).toBe(false)
})

it('loadEnvFileIfExists returns true for existing file', () => {
  expect(loadEnvFileIfExists(`${testDir}/test.env`)).toBe(true)
})
