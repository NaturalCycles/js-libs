import type { ParsedCommit, RawCommit, ReleaseType } from './release.model.js'

/**
 * Determine the release type from the commits since the last release.
 * Returns the highest release type among the commits, or null if none of them warrants a release.
 *
 * Rules follow the `@semantic-release/commit-analyzer` defaults (conventional commits only):
 * breaking change => major, feat => minor, fix/perf/revert => patch, everything else => no release.
 */
export function analyzeCommits(commits: ParsedCommit[]): ReleaseType | null {
  let result: ReleaseType | null = null

  for (const commit of commits) {
    const type = getCommitReleaseType(commit)
    if (type === 'major') return 'major'
    if (type === 'minor') result = 'minor'
    else if (type === 'patch' && !result) result = 'patch'
  }

  return result
}

/**
 * Parse a raw git commit into a conventional commit.
 * https://www.conventionalcommits.org/
 */
export function parseCommit(raw: RawCommit): ParsedCommit {
  const { hash, subject, body } = raw

  // Same pattern as commitlint.util.ts: type(scope)!: description
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/)

  const type = match?.[1]
  const scope = match?.[2]
  const bang = !!match?.[3]
  const description = match?.[4] || subject

  // `BREAKING CHANGE:` (or `BREAKING-CHANGE:`) footer, per the conventional commits spec
  const breakingMatch = body.match(/(?:^|\n)BREAKING[ -]CHANGE:\s*([\s\S]*)/)
  const breaking = bang || !!breakingMatch

  // Detect both `revert:` conventional commits and git-generated `Revert "..."` commits
  const revert = type === 'revert' || subject.startsWith('Revert ')

  return {
    hash,
    subject,
    body,
    type,
    scope,
    description,
    breaking,
    breakingNote: breaking ? breakingMatch?.[1]?.trim() || description : undefined,
    revert,
  }
}

function getCommitReleaseType(commit: ParsedCommit): ReleaseType | null {
  if (commit.breaking) return 'major'
  if (commit.revert) return 'patch'
  if (commit.type === 'feat') return 'minor'
  if (commit.type === 'fix' || commit.type === 'perf') return 'patch'
  return null
}
