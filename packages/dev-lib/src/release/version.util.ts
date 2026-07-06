import semver from 'semver'
import type { LastRelease, ReleaseChannel, ReleaseType } from './release.model.js'

/**
 * Extract versions from git tags matching the package's tag prefix.
 * Non-semver tags (and tags of other packages) are ignored.
 */
export function getVersionsFromTags(tags: string[], tagPrefix: string): string[] {
  const versions: string[] = []
  for (const tag of tags) {
    if (!tag.startsWith(tagPrefix)) continue
    const version = tag.slice(tagPrefix.length)
    if (semver.valid(version)) versions.push(version)
  }
  return versions
}

/**
 * Determine the last release relevant to the given channel,
 * replicating semantic-release `getLastRelease` semantics:
 *
 * - stable channel: the highest stable version
 * - prerelease channel: the highest among stable versions and prereleases of this channel
 *   (a prerelease belongs to the channel when its prerelease components include the identifier,
 *   e.g. `7.660.0-beta-x.4` belongs to channel `beta-x`)
 */
export function getLastRelease(
  versions: string[],
  tagPrefix: string,
  channel: ReleaseChannel,
): LastRelease | undefined {
  const candidates = versions.filter(v => {
    const prerelease = semver.prerelease(v)
    if (!prerelease) return true // stable versions are always candidates
    return !!channel.prereleaseId && prerelease.includes(channel.prereleaseId)
  })

  const [version] = candidates.sort(semver.rcompare)
  if (!version) return
  return { version, tag: `${tagPrefix}${version}` }
}

/**
 * Compute the next version, replicating semantic-release `getNextVersion` semantics.
 *
 * On a prerelease channel, when the last release is already a prerelease of this channel,
 * the next version is the highest of:
 * - the prerelease increment (`7.660.0-beta-x.4` => `7.660.0-beta-x.5`)
 * - the increment of the latest overall version (incl. prereleases) with a reset counter
 *   (jumps the base when a bigger change type lands mid-prerelease, e.g. to `8.0.0-beta-x.1`)
 */
export function getNextVersion(input: {
  lastRelease?: LastRelease
  /**
   * All versions of the package reachable from HEAD (any channel, any stability).
   */
  allVersions: string[]
  releaseType: ReleaseType
  channel: ReleaseChannel
  /**
   * Used when the package has no release tags yet. Defaults to `1.0.0`.
   */
  firstReleaseVersion?: string
}): string {
  const { lastRelease, allVersions, releaseType, channel } = input
  const { prereleaseId } = channel

  if (!lastRelease) {
    const { firstReleaseVersion } = input
    // 0.0.0 is the "version is managed by git tags" placeholder, never a real first release
    const first =
      (firstReleaseVersion &&
        !semver.prerelease(firstReleaseVersion) &&
        semver.valid(firstReleaseVersion) &&
        semver.gt(firstReleaseVersion, '0.0.0') &&
        firstReleaseVersion) ||
      '1.0.0'
    return prereleaseId ? `${first}-${prereleaseId}.1` : first
  }

  const lastVersion = lastRelease.version

  if (!prereleaseId) {
    return semver.inc(lastVersion, releaseType)!
  }

  if (semver.prerelease(lastVersion)) {
    // The last release is a prerelease of this channel (guaranteed by getLastRelease)
    const latestOverall = allVersions.toSorted(semver.rcompare)[0]!
    return highest(
      semver.inc(lastVersion, 'prerelease')!,
      `${semver.inc(latestOverall, releaseType)}-${prereleaseId}.1`,
    )
  }

  // The last release is stable - start a new prerelease sequence off it
  return `${semver.inc(lastVersion, releaseType)}-${prereleaseId}.1`
}

function highest(v1: string, v2: string): string {
  return semver.gt(v1, v2) ? v1 : v2
}
