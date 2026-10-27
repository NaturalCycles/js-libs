import { expect, it } from 'vitest'
import { loadEnvFileIfExists } from './node.util.js'
import { testDir } from './test/paths.cnst.js'

it('should return false from loadEnvFileIfExists for a missing file', () => {
  expect(loadEnvFileIfExists('.env.non-existing')).toBe(false)
})

it('should return true from loadEnvFileIfExists for an existing file', () => {
  expect(loadEnvFileIfExists(`${testDir}/test.env`)).toBe(true)
})
