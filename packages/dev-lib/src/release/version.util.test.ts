import { expect, test } from 'vitest'
import type { ReleaseChannel } from './release.model.js'
import { getLastRelease, getNextVersion, getVersionsFromTags } from './version.util.js'

const stable: ReleaseChannel = { distTag: 'latest' }
const beta: ReleaseChannel = { distTag: 'beta-x', prereleaseId: 'beta-x' }

test('getVersionsFromTags: filters by prefix and semver validity', () => {
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

test('getLastRelease: stable channel picks highest stable, ignoring prereleases', () => {
  const versions = ['7.659.0', '7.660.0-beta-x.5', '7.658.0']
  expect(getLastRelease(versions, 'v', stable)).toEqual({ version: '7.659.0', tag: 'v7.659.0' })
})

test('getLastRelease: prerelease channel picks highest among stables and own prereleases', () => {
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

test('getLastRelease: empty => undefined', () => {
  expect(getLastRelease([], 'v', stable)).toBeUndefined()
})

test('getNextVersion: stable bumps', () => {
  expect(next(['7.659.0'], 'minor', stable)).toBe('7.660.0')
  expect(next(['7.659.0'], 'patch', stable)).toBe('7.659.1')
  expect(next(['7.659.0'], 'major', stable)).toBe('8.0.0')
})

test('getNextVersion: stable branch ignores prerelease tags (graduation)', () => {
  // after beta releases, a stable release is computed off the last stable only
  expect(next(['7.659.0', '7.660.0-beta-x.5'], 'minor', stable)).toBe('7.660.0')
})

test('getNextVersion: first release', () => {
  expect(next([], 'minor', stable)).toBe('1.0.0')
  expect(next([], 'minor', stable, '2.5.0')).toBe('2.5.0')
  expect(next([], 'minor', stable, 'garbage')).toBe('1.0.0')
  expect(next([], 'minor', beta)).toBe('1.0.0-beta-x.1')
})

test('getNextVersion: first prerelease off a stable', () => {
  // observed: shared 7.659.0 + feat on beta-x => 7.660.0-beta-x.1
  expect(next(['7.659.0'], 'minor', beta)).toBe('7.660.0-beta-x.1')
  expect(next(['7.659.0'], 'patch', beta)).toBe('7.659.1-beta-x.1')
  expect(next(['7.659.0'], 'major', beta)).toBe('8.0.0-beta-x.1')
})

test('getNextVersion: prerelease counter increments on same base', () => {
  // observed: shared 7.660.0-beta-serialized-quiz.1 ... .5 sequence, even with feat commits:
  // inc('7.660.0-beta-x.4', 'minor') strips the prerelease without bumping (semver pre-minor rule),
  // so the "reset" candidate 7.660.0-beta-x.1 loses to the increment 7.660.0-beta-x.5
  expect(next(['7.659.0', '7.660.0-beta-x.4'], 'minor', beta)).toBe('7.660.0-beta-x.5')
  expect(next(['7.659.0', '7.660.0-beta-x.4'], 'patch', beta)).toBe('7.660.0-beta-x.5')
})

test('getNextVersion: prerelease base jumps when a major lands mid-beta', () => {
  expect(next(['7.659.0', '7.660.0-beta-x.4'], 'major', beta)).toBe('8.0.0-beta-x.1')
})

test('getNextVersion: prerelease base accounts for other channels (collision avoidance)', () => {
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
