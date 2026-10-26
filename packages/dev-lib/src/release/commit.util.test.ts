import { expect, it } from 'vitest'
import { analyzeCommits, parseCommit } from './commit.util.js'
import type { RawCommit } from './release.model.js'

function commit(subject: string, body = ''): RawCommit {
  return { hash: 'abcdef1234567890abcdef1234567890abcdef12', subject, body }
}

it('parseCommit: feat with scope', () => {
  const c = parseCommit(commit('feat(array): add _chunk'))
  expect(c.type).toBe('feat')
  expect(c.scope).toBe('array')
  expect(c.description).toBe('add _chunk')
  expect(c.breaking).toBe(false)
  expect(c.revert).toBe(false)
})

it('parseCommit: fix without scope', () => {
  const c = parseCommit(commit('fix: resolve crash'))
  expect(c.type).toBe('fix')
  expect(c.scope).toBeUndefined()
  expect(c.description).toBe('resolve crash')
})

it('parseCommit: breaking via bang', () => {
  const c = parseCommit(commit('feat!: drop node 18 support'))
  expect(c.breaking).toBe(true)
  expect(c.breakingNote).toBe('drop node 18 support')
})

it('parseCommit: breaking via footer', () => {
  const c = parseCommit(
    commit('feat: new api', 'Some body\n\nBREAKING CHANGE: the old api is removed'),
  )
  expect(c.breaking).toBe(true)
  expect(c.breakingNote).toBe('the old api is removed')
})

it('parseCommit: breaking via BREAKING-CHANGE footer', () => {
  const c = parseCommit(commit('refactor: cleanup', 'BREAKING-CHANGE: renamed exports'))
  expect(c.breaking).toBe(true)
  expect(c.breakingNote).toBe('renamed exports')
})

it('parseCommit: revert type', () => {
  const c = parseCommit(commit('revert: feat(array): add _chunk'))
  expect(c.revert).toBe(true)
})

it('parseCommit: git-generated revert', () => {
  const c = parseCommit(commit('Revert "feat(array): add _chunk"'))
  expect(c.revert).toBe(true)
  expect(c.type).toBeUndefined()
})

it('parseCommit: non-conventional commit', () => {
  const c = parseCommit(commit('updated stuff'))
  expect(c.type).toBeUndefined()
  expect(c.description).toBe('updated stuff')
  expect(c.breaking).toBe(false)
})

it('analyzeCommits: empty => no release', () => {
  expect(analyzeCommits([])).toBeNull()
})

it('analyzeCommits: only chore/docs => no release', () => {
  const commits = [commit('chore: deps'), commit('docs: update readme')].map(parseCommit)
  expect(analyzeCommits(commits)).toBeNull()
})

it('analyzeCommits: fix => patch', () => {
  const commits = [commit('chore: deps'), commit('fix: bug')].map(parseCommit)
  expect(analyzeCommits(commits)).toBe('patch')
})

it('analyzeCommits: perf => patch', () => {
  expect(analyzeCommits([parseCommit(commit('perf: faster sort'))])).toBe('patch')
})

it('analyzeCommits: revert => patch', () => {
  expect(analyzeCommits([parseCommit(commit('Revert "feat: x"'))])).toBe('patch')
})

it('analyzeCommits: feat beats fix => minor', () => {
  const commits = [commit('fix: bug'), commit('feat: new thing')].map(parseCommit)
  expect(analyzeCommits(commits)).toBe('minor')
})

it('analyzeCommits: breaking beats all => major', () => {
  const commits = [commit('fix: bug'), commit('chore!: drop old node')].map(parseCommit)
  expect(analyzeCommits(commits)).toBe('major')
})
