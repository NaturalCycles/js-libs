import { expect, it } from 'vitest'
import type { ReleaseChannel } from './release.model.js'
import { getLastRelease, getNextVersion, getVersionsFromTags } from './version.util.js'

const stable: ReleaseChannel = { distTag: 'latest' }
const beta: ReleaseChannel = { distTag: 'beta-x', prereleaseId: 'beta-x' }

it('should keep only the valid semver versions of tags with the prefix', () => {
  const tags = [
    '@naturalcycles/shared-v7.660.0',
    '@naturalcycles/shared-v7.660.0-beta-x.1',
    '@naturalcycles/shared-test-v1.0.1', // different package, prefix must not match
    '@naturalcycles/js-lib-v15.80.0',
    '20250523-130010', // not a release tag
    '@naturalcycles/shared-vgarbage',
  ]
  expect(getVersionsFromTags(tags, '@naturalcycles/shared-v')).toEqual([
    '7.660.0',
    '7.660.0-beta-x.1',
  ])
  expect(getVersionsFromTags(tags, 'v')).toEqual([])
})

it('should pick the highest stable version on the stable channel', () => {
  const versions = ['7.659.0', '7.660.0-beta-x.5', '7.658.0']
  expect(getLastRelease(versions, 'v', stable)).toEqual({ version: '7.659.0', tag: 'v7.659.0' })
})

it('should pick the highest of stables and own prereleases on a prerelease channel', () => {
  // own prerelease is higher than the last stable
  expect(getLastRelease(['7.659.0', '7.660.0-beta-x.4'], 'v', beta)).toEqual({
    version: '7.660.0-beta-x.4',
    tag: 'v7.660.0-beta-x.4',
  })
  // a newer stable trumps the own prerelease
  expect(getLastRelease(['7.660.0', '7.660.0-beta-x.4'], 'v', beta)?.version).toBe('7.660.0')
  // other channels' prereleases are never candidates
  expect(getLastRelease(['7.659.0', '7.660.0-beta-other.1'], 'v', beta)?.version).toBe('7.659.0')
})

it('should return undefined without versions', () => {
  expect(getLastRelease([], 'v', stable)).toBeUndefined()
})

it('should bump a stable version by the release type', () => {
  expect(next(['7.659.0'], 'minor', stable)).toBe('7.660.0')
  expect(next(['7.659.0'], 'patch', stable)).toBe('7.659.1')
  expect(next(['7.659.0'], 'major', stable)).toBe('8.0.0')
})

it('should ignore prerelease versions on the stable channel', () => {
  // after beta releases, a stable release is computed off the last stable only
  expect(next(['7.659.0', '7.660.0-beta-x.5'], 'minor', stable)).toBe('7.660.0')
})

it('should start the first release at 1.0.0 unless a valid first version is given', () => {
  expect(next([], 'minor', stable)).toBe('1.0.0')
  expect(next([], 'minor', stable, '2.5.0')).toBe('2.5.0')
  expect(next([], 'minor', stable, 'garbage')).toBe('1.0.0')
  expect(next([], 'minor', stable, '0.0.0')).toBe('1.0.0')
  expect(next([], 'minor', beta)).toBe('1.0.0-beta-x.1')
})

it('should bump the base for the first prerelease after a stable', () => {
  // observed: shared 7.659.0 + feat on beta-x => 7.660.0-beta-x.1
  expect(next(['7.659.0'], 'minor', beta)).toBe('7.660.0-beta-x.1')
  expect(next(['7.659.0'], 'patch', beta)).toBe('7.659.1-beta-x.1')
  expect(next(['7.659.0'], 'major', beta)).toBe('8.0.0-beta-x.1')
})

it('should increment the prerelease counter on the same base', () => {
  // observed: shared 7.660.0-beta-serialized-quiz.1 ... .5 sequence, even with feat commits:
  // inc('7.660.0-beta-x.4', 'minor') strips the prerelease without bumping (semver pre-minor rule),
  // so the "reset" candidate 7.660.0-beta-x.1 loses to the increment 7.660.0-beta-x.5
  expect(next(['7.659.0', '7.660.0-beta-x.4'], 'minor', beta)).toBe('7.660.0-beta-x.5')
  expect(next(['7.659.0', '7.660.0-beta-x.4'], 'patch', beta)).toBe('7.660.0-beta-x.5')
})

it('should move the prerelease base to the next major when a major lands mid-prerelease', () => {
  expect(next(['7.659.0', '7.660.0-beta-x.4'], 'major', beta)).toBe('8.0.0-beta-x.1')
})

it('should base a new prerelease on the latest version of any channel', () => {
  // another beta branch released 7.661.0-beta-other.1 and got merged into this branch's history:
  // the reset candidate is computed off the latest overall version, avoiding a duplicate 7.660.x
  const versions = ['7.659.0', '7.660.0-beta-x.1', '7.661.0-beta-other.1']
  expect(next(versions, 'minor', beta)).toBe('7.661.0-beta-x.1')
})

function next(
  versions: string[],
  releaseType: 'major' | 'minor' | 'patch',
  channel: ReleaseChannel,
  firstReleaseVersion?: string,
): string {
  return getNextVersion({
    lastRelease: getLastRelease(versions, 'v', channel),
    allVersions: versions,
    releaseType,
    channel,
    firstReleaseVersion,
  })
}
