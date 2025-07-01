import { expect, test } from 'vitest'
import { fs2 } from '../fs/index.js'
import { requireEnvKeys } from '../index.js'
import { srcDir } from '../test/paths.cnst.js'

test('requireEnvKeys', () => {
  expect(() => requireEnvKeys('NON_EXISTING')).toThrowErrorMatchingInlineSnapshot(
    `[Error: NON_EXISTING env variable is required, but missing]`,
  )

  process.env['AAAA'] = 'aaaa'
  expect(requireEnvKeys('AAAA')).toEqual({
    AAAA: 'aaaa',
  })

  process.env['BBBB'] = '' // not allowed
  expect(() => requireEnvKeys('BBBB')).toThrowErrorMatchingInlineSnapshot(
    `[Error: BBBB env variable is required, but missing]`,
  )

  process.env['CCCC'] = 'cccc'
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
