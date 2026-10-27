import { expect, it } from 'vitest'
import { analyzeCommits, parseCommit } from './commit.util.js'
import type { RawCommit } from './release.model.js'

function commit(subject: string, body = ''): RawCommit {
  return { hash: 'abcdef1234567890abcdef1234567890abcdef12', subject, body }
}

it('should parse the type, scope and description of a commit', () => {
  const c = parseCommit(commit('feat(array): add _chunk'))
  expect(c.type).toBe('feat')
  expect(c.scope).toBe('array')
  expect(c.description).toBe('add _chunk')
  expect(c.breaking).toBe(false)
  expect(c.revert).toBe(false)
})

it('should parse a commit without a scope', () => {
  const c = parseCommit(commit('fix: resolve crash'))
  expect(c.type).toBe('fix')
  expect(c.scope).toBeUndefined()
  expect(c.description).toBe('resolve crash')
})

it('should parse a breaking change marked with a bang', () => {
  const c = parseCommit(commit('feat!: drop node 18 support'))
  expect(c.breaking).toBe(true)
  expect(c.breakingNote).toBe('drop node 18 support')
})

it('should parse a breaking change from a BREAKING CHANGE footer', () => {
  const c = parseCommit(
    commit('feat: new api', 'Some body\n\nBREAKING CHANGE: the old api is removed'),
  )
  expect(c.breaking).toBe(true)
  expect(c.breakingNote).toBe('the old api is removed')
})

it('should parse a breaking change from a BREAKING-CHANGE footer', () => {
  const c = parseCommit(commit('refactor: cleanup', 'BREAKING-CHANGE: renamed exports'))
  expect(c.breaking).toBe(true)
  expect(c.breakingNote).toBe('renamed exports')
})

it('should parse a commit of the revert type as a revert', () => {
  const c = parseCommit(commit('revert: feat(array): add _chunk'))
  expect(c.revert).toBe(true)
})

it('should parse a git-generated revert commit as a revert without a type', () => {
  const c = parseCommit(commit('Revert "feat(array): add _chunk"'))
  expect(c.revert).toBe(true)
  expect(c.type).toBeUndefined()
})

it('should parse a non-conventional commit as a description without a type', () => {
  const c = parseCommit(commit('updated stuff'))
  expect(c.type).toBeUndefined()
  expect(c.description).toBe('updated stuff')
  expect(c.breaking).toBe(false)
})

it('should return no release for no commits', () => {
  expect(analyzeCommits([])).toBeNull()
})

it('should return no release for only chore and docs commits', () => {
  const commits = [commit('chore: deps'), commit('docs: update readme')].map(parseCommit)
  expect(analyzeCommits(commits)).toBeNull()
})

it('should return a patch release for a fix', () => {
  const commits = [commit('chore: deps'), commit('fix: bug')].map(parseCommit)
  expect(analyzeCommits(commits)).toBe('patch')
})

it('should return a patch release for a perf commit', () => {
  expect(analyzeCommits([parseCommit(commit('perf: faster sort'))])).toBe('patch')
})

it('should return a patch release for a revert', () => {
  expect(analyzeCommits([parseCommit(commit('Revert "feat: x"'))])).toBe('patch')
})

it('should return a minor release when a feat comes with a fix', () => {
  const commits = [commit('fix: bug'), commit('feat: new thing')].map(parseCommit)
  expect(analyzeCommits(commits)).toBe('minor')
})

it('should return a major release for a breaking change', () => {
  const commits = [commit('fix: bug'), commit('chore!: drop old node')].map(parseCommit)
  expect(analyzeCommits(commits)).toBe('major')
})
