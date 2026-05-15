import { execSync, spawnSync } from 'node:child_process'
import { basename } from 'node:path'
import { _uniq } from '@naturalcycles/js-lib/array'
import type { UnixTimestamp } from '@naturalcycles/js-lib/types'
import { exec2 } from '../exec2/exec2.js'

/**
 * Set of utility functions to work with git.
 */
class Git2 {
  getLastGitCommitMsg(): string {
    return exec2.exec('git log -1 --pretty=%B')
  }

  commitMessageToTitleMessage(msg: string): string {
    const firstLine = msg.split('\n')[0]!
    const [preTitle, title] = firstLine.split(': ')
    return title || preTitle!
  }

  hasUncommittedChanges(): boolean {
    // git diff-index --quiet HEAD -- || echo "untracked"
    try {
      execSync('git diff-index --quiet HEAD --', {
        encoding: 'utf8',
      })
      return false
    } catch {
      return true
    }
  }

  /**
   * @returns true if there were changes
   */
  commitAll(msg: string): boolean {
    try {
      const r = spawnSync('git', ['commit', '-a', '--no-verify', '-m', msg], {
        stdio: 'inherit',
      })

      return !r.error && !r.status
    } catch {
      return false
    }
  }

  /**
   * @returns true if there are not pushed commits.
   */
  isAhead(): boolean {
    // ahead=`git rev-list HEAD --not --remotes | wc -l | awk '{print $1}'`
    const cmd = `git rev-list HEAD --not --remotes | wc -l | awk '{print $1}'`
    const stdout = exec2.exec(cmd)
    // console.log(`gitIsAhead: ${stdout}`)
    return Number(stdout) > 0
  }

  fetch(): void {
    const cmd = 'git fetch'
    try {
      execSync(cmd, {
        stdio: 'inherit',
      })
    } catch {}
  }

  pull(): void {
    const cmd = 'git pull'
    try {
      execSync(cmd, {
        stdio: 'inherit',
      })
    } catch {}
  }

  push(): void {
    // git push --set-upstream origin $CIRCLE_BRANCH && echo "pushed, exiting" && exit 0
    let cmd = 'git push'

    const branchName = this.getCurrentBranchName()

    if (branchName) {
      cmd += ` --set-upstream origin ${branchName}`
    }

    exec2.spawn(cmd, { logStart: true })
  }

  getCurrentCommitSha(full = false): string {
    const sha = exec2.exec('git rev-parse HEAD')
    return full ? sha : sha.slice(0, 7)
  }

  getCurrentCommitTimestamp(): UnixTimestamp {
    return Number(exec2.exec('git log -1 --format=%ct')) as UnixTimestamp
  }

  getCurrentBranchName(): string {
    return exec2.exec('git rev-parse --abbrev-ref HEAD')
  }

  getCurrentRepoName(): string {
    const originUrl = exec2.exec('git config --get remote.origin.url')
    return basename(originUrl, '.git')
  }

  getAllBranchesNames(): string[] {
    /**
     * Raw output example from this repository:
     * $ git branch -r
     * origin/DEV-22569-zod-isoDate-params
     * origin/DEV-23052-git2-add-method
     * origin/HEAD -> origin/main
     * origin/add-requiredpick-type-helper
     * origin/better-object-keys
     * origin/feat/immutable-j-1
     * origin/feat/immutable-j-2
     * origin/feat/random-string-util
     * origin/fix-vsc-red-line
     * origin/generic-cachekey-function-2
     * origin/gh-pages
     * origin/main
     * origin/stringify-or-undefined
     */
    return exec2
      .exec('git branch -r')
      .split('\n')
      .map(s => s.trim())
      .filter(s => !s.includes(' -> '))
      .map(s => s.split('/')[1]!)
  }

  gitRefExists(ref: string): boolean {
    try {
      exec2.exec(`git rev-parse --verify --quiet ${ref}`)
      return true
    } catch {
      return false
    }
  }

  getTrackedFiles(): string[] {
    try {
      return exec2
        .exec('git ls-files')
        .split('\n')
        .filter(s => s.trim().length)
    } catch {
      return []
    }
  }

  getUntrackedFiles(): string[] {
    try {
      return exec2
        .exec('git ls-files --others --exclude-standard')
        .split('\n')
        .filter(s => s.trim().length)
    } catch {
      return []
    }
  }

  getTrackedChangedFiles(diffBase: string, diffFilter = 'AMR'): string[] {
    try {
      return exec2
        .exec(`git diff --name-only --diff-filter=${diffFilter} ${diffBase}`)
        .split('\n')
        .filter(s => s.trim().length)
    } catch {
      return []
    }
  }

  /**
   * @returns both tracked changed and untracked files
   */
  getAllChangedFiles(diffBase: string): string[] {
    const tracked = this.getTrackedChangedFiles(diffBase)
    const untracked = this.getUntrackedFiles()

    const changes = [...tracked, ...untracked]
    return _uniq(changes)
  }
}

export const git2 = new Git2()
