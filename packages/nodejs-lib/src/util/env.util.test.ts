import { afterAll, expect, test, vi } from 'vitest'
import { fs2 } from '../fs/fs2.js'
import { requireEnvKeys } from '../index.js'
import { srcDir } from '../test/paths.cnst.js'

afterAll(() => {
  process.env['APP_ENV'] = 'test' // restore
})

test('requireEnvKeys', () => {
  expect(() => requireEnvKeys('NON_EXISTING')).toThrowErrorMatchingInlineSnapshot(
    `[Error: NON_EXISTING env variable is required, but missing]`,
  )

  vi.stubEnv('AAAA', 'aaaa')
  expect(requireEnvKeys('AAAA')).toEqual({
    AAAA: 'aaaa',
  })

  vi.stubEnv('BBBB', '') // not allowed
  expect(() => requireEnvKeys('BBBB')).toThrowErrorMatchingInlineSnapshot(
    `[Error: BBBB env variable is required, but missing]`,
  )

  vi.stubEnv('CCCC', 'cccc')
  expect(requireEnvKeys('AAAA', 'CCCC')).toEqual({
    AAAA: 'aaaa',
    CCCC: 'cccc',
  })
})

test('requireFileToExist', async () => {
  // should not throw
  fs2.requireFileToExist(`${srcDir}/util/env.util.ts`)

  expect(() => fs2.requireFileToExist(`${srcDir}/util/non-existing`)).toThrow(`should exist`)
})
