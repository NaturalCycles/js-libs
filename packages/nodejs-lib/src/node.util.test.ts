import { expect, test } from 'vitest'
import { loadEnvFileIfExists } from './node.util.js'
import { testDir } from './test/paths.cnst.js'

test('loadEnvFileIfExists returns false for non-existing file', () => {
  expect(loadEnvFileIfExists('.env.non-existing')).toBe(false)
})

test('loadEnvFileIfExists returns true for existing file', () => {
  expect(loadEnvFileIfExists(`${testDir}/test.env`)).toBe(true)
})
