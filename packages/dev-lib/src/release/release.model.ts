export type ReleaseType = 'major' | 'minor' | 'patch'

/**
 * Release channel, resolved from the current git branch and the release config.
 */
export interface ReleaseChannel {
  /**
   * npm dist-tag to publish under: `latest` on stable branches, the branch name on prerelease branches.
   */
  distTag: string
  /**
   * Prerelease identifier (the branch name, e.g. `beta-my-feature`).
   * Undefined on stable branches.
   */
  prereleaseId?: string
}

export interface ReleasePackage {
  name: string
  /**
   * Absolute path to the package directory.
   */
  dir: string
  /**
   * Package directory relative to the repo root, e.g. `packages/js-lib`.
   * Empty string in single-repo mode (the root package) - means "no path filtering".
   */
  relativeDir: string
  /**
   * Git tag prefix: `<name>-v` in monorepo mode, `v` in single-repo mode.
   * Full tag is `<tagPrefix><version>`, e.g. `@naturalcycles/js-lib-v15.80.0` or `v7.660.0`.
   */
  tagPrefix: string
}

export interface RepoInfo {
  owner: string
  repo: string
  /**
   * e.g. `https://github.com/NaturalCycles/js-libs`
   */
  url: string
}

export interface RawCommit {
  hash: string
  subject: string
  body: string
}

export interface ParsedCommit {
  hash: string
  subject: string
  body: string
  /**
   * Conventional commit type, e.g. `feat`, `fix`.
   * Undefined if the subject is not a valid conventional commit.
   */
  type?: string
  scope?: string
  /**
   * Subject without the `type(scope):` prefix.
   * Falls back to the full subject for non-conventional commits.
   */
  description: string
  breaking: boolean
  /**
   * Text of the `BREAKING CHANGE:` footer, or the description when marked with `!` only.
   */
  breakingNote?: string
  revert: boolean
}

export interface LastRelease {
  version: string
  tag: string
}

export interface ReleasePlan {
  pkg: ReleasePackage
  lastRelease?: LastRelease
  releaseType: ReleaseType
  nextVersion: string
  nextTag: string
  channel: ReleaseChannel
  commits: ParsedCommit[]
  notes: string
}
