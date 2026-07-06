import { expect, test } from 'vitest'
import { resolveChannel } from './release.command.js'

const stableBranches = ['main', 'master']
const prereleaseBranches = ['beta-*']

test('resolveChannel: stable branches', () => {
  expect(resolveChannel('main', stableBranches, prereleaseBranches)).toEqual({ distTag: 'latest' })
  expect(resolveChannel('master', stableBranches, prereleaseBranches)).toEqual({
    distTag: 'latest',
  })
})

test('resolveChannel: prerelease branch glob', () => {
  expect(resolveChannel('beta-DEV-23788', stableBranches, prereleaseBranches)).toEqual({
    distTag: 'beta-DEV-23788',
    prereleaseId: 'beta-DEV-23788',
  })
})

test('resolveChannel: unconfigured branch => undefined', () => {
  expect(resolveChannel('feature-x', stableBranches, prereleaseBranches)).toBeUndefined()
  expect(resolveChannel('beta', stableBranches, prereleaseBranches)).toBeUndefined()
})

test('resolveChannel: invalid prerelease identifier throws', () => {
  expect(() => resolveChannel('beta-foo.bar', stableBranches, ['beta-*'])).toThrow(
    'prerelease identifier',
  )
})
