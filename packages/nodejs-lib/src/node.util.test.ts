import { expect, it, vi } from 'vitest'
import { loadEnvFileIfExists } from './node.util.js'
import { testDir } from './test/paths.cnst.js'

it('should return false from loadEnvFileIfExists for a missing file', () => {
  expect(loadEnvFileIfExists('.env.non-existing')).toBe(false)
})

it('should load the variables of an existing file into process.env and return true', () => {
  vi.stubEnv('LOADENV_TEST_VAR', undefined)

  expect(loadEnvFileIfExists(`${testDir}/test.env`)).toBe(true)
  expect(process.env['LOADENV_TEST_VAR']).toBe('hello123')
})
