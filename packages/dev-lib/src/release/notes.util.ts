import type { ParsedCommit, RepoInfo } from './release.model.js'

/**
 * Generate release notes markdown for a GitHub Release,
 * following the format of `@semantic-release/release-notes-generator` (angular preset):
 * sections per commit type, entries linking to commits, compare link in the header.
 */
export function generateReleaseNotes(input: {
  repo: RepoInfo
  commits: ParsedCommit[]
  lastTag?: string
  nextTag: string
  /**
   * `YYYY-MM-DD`, defaults to today. Injectable for tests.
   */
  date?: string
}): string {
  const { repo, commits, lastTag, nextTag } = input
  const date = input.date || new Date().toISOString().slice(0, 10)

  const header = lastTag
    ? `## [${nextTag}](${repo.url}/compare/${lastTag}...${nextTag}) (${date})`
    : `## ${nextTag} (${date})`

  const sections: string[] = [header]

  addSection(
    sections,
    '### Features',
    commits.filter(c => c.type === 'feat'),
    repo,
  )
  addSection(
    sections,
    '### Bug Fixes',
    commits.filter(c => c.type === 'fix'),
    repo,
  )
  addSection(
    sections,
    '### Performance Improvements',
    commits.filter(c => c.type === 'perf'),
    repo,
  )
  addSection(
    sections,
    '### Reverts',
    commits.filter(c => c.revert && c.type !== 'feat' && c.type !== 'fix' && c.type !== 'perf'),
    repo,
  )

  const breaking = commits.filter(c => c.breaking)
  if (breaking.length) {
    sections.push(
      '### ⚠ BREAKING CHANGES',
      breaking.map(c => `* ${scopePrefix(c)}${c.breakingNote}`).join('\n'),
    )
  }

  return sections.join('\n\n') + '\n'
}

function addSection(
  sections: string[],
  title: string,
  commits: ParsedCommit[],
  repo: RepoInfo,
): void {
  if (!commits.length) return
  sections.push(title, commits.map(c => formatCommitEntry(c, repo)).join('\n'))
}

function formatCommitEntry(c: ParsedCommit, repo: RepoInfo): string {
  const shortHash = c.hash.slice(0, 7)
  return `* ${scopePrefix(c)}${c.description} ([${shortHash}](${repo.url}/commit/${c.hash}))`
}

function scopePrefix(c: ParsedCommit): string {
  return c.scope ? `**${c.scope}:** ` : ''
}
