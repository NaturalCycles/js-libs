import { expect, test } from 'vitest'
import { git2 } from './git2.js'

test('getLastGitCommitMsg', async () => {
  const msg = git2.getLastGitCommitMsg()
  console.log({ msg })
  expect(msg).toBeDefined()

  const title = git2.commitMessageToTitleMessage(msg)
  console.log({ title })
  expect(title).toBeDefined()
})

test('hasUncommittedChanges', async () => {
  const changes = git2.hasUncommittedChanges()
  console.log({ changes })
})

test('getCurrentBranchName', async () => {
  const branchName = git2.getCurrentBranchName()
  console.log(branchName)

  expect(branchName).toBeDefined()
  expect(branchName).not.toHaveLength(0)
})

test('getCurrentRepoName', async () => {
  const repoName = git2.getCurrentRepoName()
  console.log(repoName)

  expect(repoName).toBeDefined()
  expect(repoName).not.toHaveLength(0)
})

test('getCurrentCommitTimestamp', async () => {
  const ts = git2.getCurrentCommitTimestamp()
  console.log(ts, new Date(ts * 1000))
})

test('isAhead', async () => {
  const isAhead = git2.isAhead()
  console.log(isAhead)

  expect(isAhead).toBeDefined()
})

test('getAllBranchesNames', async () => {
  const branches = git2.getAllBranchesNames()
  console.log(branches)

  expect(branches).toBeDefined()
  expect(branches).not.toHaveLength(0)
})

test('getCurrentCommitSha', async () => {
  const sha = git2.getCurrentCommitSha()
  console.log(sha)

  expect(sha).toBeDefined()
  expect(sha).not.toHaveLength(0)
})

test('gitRefExists', async () => {
  const sha = git2.getCurrentCommitSha()
  const exists = git2.gitRefExists(sha)
  console.log(exists)
  const headExists = git2.gitRefExists('HEAD')
  console.log(headExists)

  expect(exists).toBe(true)
  expect(headExists).toBe(true)
})

test('getTrackedFiles', async () => {
  const trackedFiles = git2.getTrackedFiles()
  console.log(trackedFiles)

  expect(trackedFiles).toBeDefined()
})

test('getUntrackedFiles', async () => {
  const untrackedFiles = git2.getUntrackedFiles()
  console.log(untrackedFiles)

  expect(untrackedFiles).toBeDefined()
})

test('getTrackedChangedFiles', async () => {
  const sha = git2.getCurrentCommitSha()
  const trackedChangedFiles = git2.getTrackedChangedFiles(sha)
  console.log(trackedChangedFiles)

  expect(trackedChangedFiles).toBeDefined()
})

test('getAllChangedFiles', async () => {
  const sha = git2.getCurrentCommitSha()
  const allChangedFiles = git2.getAllChangedFiles(sha)
  console.log(allChangedFiles)

  expect(allChangedFiles).toBeDefined()
})
