import { expect, it } from 'vitest'
import { resolveChannel } from './release.command.js'

const stableBranches = ['main', 'master']
const prereleaseBranches = ['beta-*']

it('should resolve stable branches to the latest dist-tag', () => {
  expect(resolveChannel('main', stableBranches, prereleaseBranches)).toEqual({ distTag: 'latest' })
  expect(resolveChannel('master', stableBranches, prereleaseBranches)).toEqual({
    distTag: 'latest',
  })
})

it('should resolve a branch matching a prerelease glob to a prerelease channel', () => {
  expect(resolveChannel('beta-DEV-23788', stableBranches, prereleaseBranches)).toEqual({
    distTag: 'beta-DEV-23788',
    prereleaseId: 'beta-DEV-23788',
  })
})

it('should return undefined for an unconfigured branch', () => {
  expect(resolveChannel('feature-x', stableBranches, prereleaseBranches)).toBeUndefined()
  expect(resolveChannel('beta', stableBranches, prereleaseBranches)).toBeUndefined()
})

it('should throw on an invalid prerelease identifier', () => {
  expect(() => resolveChannel('beta-foo.bar', stableBranches, ['beta-*'])).toThrow(
    'prerelease identifier',
  )
})
