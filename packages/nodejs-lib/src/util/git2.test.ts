import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { exec2 } from '../exec2/exec2.js'
import { fs2 } from '../fs/fs2.js'
import { git2 } from './git2.js'

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

describe('in a repo with a pushed and an unpushed commit, a modified and an untracked file', () => {
  let repoDir: string

  beforeAll(() => {
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git2-'))
    git(repoDir, 'init -q -b main')
    fs2.writeFile(`${repoDir}/a.txt`, 'a')
    git(repoDir, 'add a.txt')
    git(repoDir, 'commit -q --no-verify -m "feat: add a"')
    git(repoDir, 'update-ref refs/remotes/origin/main HEAD')
    fs2.writeFile(`${repoDir}/b.txt`, 'b')
    git(repoDir, 'add b.txt')
    git(repoDir, 'commit -q --no-verify -m "fix: add b" -m "body"')
    fs2.writeFile(`${repoDir}/a.txt`, 'a2')
    fs2.writeFile(`${repoDir}/c.txt`, 'c')
  })

  beforeEach(() => {
    vi.stubEnv('GIT_DIR', `${repoDir}/.git`)
    vi.stubEnv('GIT_WORK_TREE', repoDir)
  })

  afterAll(() => {
    fs2.removePath(repoDir)
  })

  it('should read the last commit message and its title without the type prefix', () => {
    const msg = git2.getLastGitCommitMsg()
    expect(msg).toBe('fix: add b\n\nbody')
    expect(git2.commitMessageToTitleMessage(msg)).toBe('add b')
  })

  it('should report uncommitted changes only while a tracked file differs from HEAD', () => {
    expect(git2.hasUncommittedChanges()).toBe(true)

    fs2.writeFile(`${repoDir}/a.txt`, 'a')
    try {
      git(repoDir, 'update-index -q --refresh')
      expect(git2.hasUncommittedChanges()).toBe(false)
    } finally {
      fs2.writeFile(`${repoDir}/a.txt`, 'a2')
    }
  })

  it('should read the current commit timestamp', () => {
    expect(git2.getCurrentCommitTimestamp()).toBe(MOCK_TS_2018_06_21)
  })

  it('should report HEAD as ahead only while it has a commit missing from the remotes', () => {
    expect(git2.isAhead()).toBe(true)

    git(repoDir, 'update-ref refs/remotes/origin/main HEAD')
    try {
      expect(git2.isAhead()).toBe(false)
    } finally {
      git(repoDir, 'update-ref refs/remotes/origin/main HEAD~1')
    }
  })

  it('should list the tracked files', () => {
    expect(git2.getTrackedFiles()).toEqual(['a.txt', 'b.txt'])
  })

  it('should list the untracked files', () => {
    expect(git2.getUntrackedFiles()).toEqual(['c.txt'])
  })

  it('should list the tracked files changed since a commit', () => {
    expect(git2.getTrackedChangedFiles('HEAD')).toEqual(['a.txt'])
    expect(git2.getTrackedChangedFiles('HEAD~1')).toEqual(['a.txt', 'b.txt'])
  })

  it('should list the tracked and untracked files changed since a commit', () => {
    expect(git2.getAllChangedFiles('HEAD~1')).toEqual(['a.txt', 'b.txt', 'c.txt'])
  })
})

function git(repoDir: string, args: string): void {
  exec2.exec(`git -c commit.gpgsign=false ${args}`, {
    cwd: repoDir,
    env: {
      GIT_DIR: `${repoDir}/.git`,
      GIT_WORK_TREE: repoDir,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_AUTHOR_DATE: `${MOCK_TS_2018_06_21} +0000`,
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
      GIT_COMMITTER_DATE: `${MOCK_TS_2018_06_21} +0000`,
    },
  })
}
