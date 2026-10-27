import { expect, it } from 'vitest'
import { git2 } from './git2.js'

it('should not throw when reading the last commit message and its title', async () => {
  const msg = git2.getLastGitCommitMsg()
  console.log({ msg })
  expect(msg).toBeDefined()

  const title = git2.commitMessageToTitleMessage(msg)
  console.log({ title })
  expect(title).toBeDefined()
})

it('should not throw when checking for uncommitted changes', async () => {
  const changes = git2.hasUncommittedChanges()
  console.log({ changes })
})

it('should return a non-empty current branch name', async () => {
  const branchName = git2.getCurrentBranchName()
  console.log(branchName)

  expect(branchName).toBeDefined()
  expect(branchName).not.toHaveLength(0)
})

it('should return a non-empty current repo name', async () => {
  const repoName = git2.getCurrentRepoName()
  console.log(repoName)

  expect(repoName).toBeDefined()
  expect(repoName).not.toHaveLength(0)
})

it('should not throw when reading the current commit timestamp', async () => {
  const ts = git2.getCurrentCommitTimestamp()
  console.log(ts, new Date(ts * 1000))
})

it('should not throw when checking whether HEAD is ahead', async () => {
  const isAhead = git2.isAhead()
  console.log(isAhead)

  expect(isAhead).toBeDefined()
})

it('should return a non-empty list of branch names', async () => {
  const branches = git2.getAllBranchesNames()
  console.log(branches)

  expect(branches).toBeDefined()
  expect(branches).not.toHaveLength(0)
})

it('should return a non-empty current commit sha', async () => {
  const sha = git2.getCurrentCommitSha()
  console.log(sha)

  expect(sha).toBeDefined()
  expect(sha).not.toHaveLength(0)
})

it('should find the current commit sha and HEAD as existing refs', async () => {
  const sha = git2.getCurrentCommitSha()
  const exists = git2.gitRefExists(sha)
  console.log(exists)
  const headExists = git2.gitRefExists('HEAD')
  console.log(headExists)

  expect(exists).toBe(true)
  expect(headExists).toBe(true)
})

it('should not throw when listing tracked files', async () => {
  const trackedFiles = git2.getTrackedFiles()
  console.log(trackedFiles)

  expect(trackedFiles).toBeDefined()
})

it('should not throw when listing untracked files', async () => {
  const untrackedFiles = git2.getUntrackedFiles()
  console.log(untrackedFiles)

  expect(untrackedFiles).toBeDefined()
})

it('should not throw when listing tracked files changed since a commit', async () => {
  const sha = git2.getCurrentCommitSha()
  const trackedChangedFiles = git2.getTrackedChangedFiles(sha)
  console.log(trackedChangedFiles)

  expect(trackedChangedFiles).toBeDefined()
})

it('should not throw when listing all files changed since a commit', async () => {
  const sha = git2.getCurrentCommitSha()
  const allChangedFiles = git2.getAllChangedFiles(sha)
  console.log(allChangedFiles)

  expect(allChangedFiles).toBeDefined()
})
