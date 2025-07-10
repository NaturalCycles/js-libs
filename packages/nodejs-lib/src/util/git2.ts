import { execSync } from 'node:child_process'
import { basename } from 'node:path'
import type { UnixTimestamp } from '@naturalcycles/js-lib/types'
import { exec2 } from '../exec2.js'

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
   * Returns true if there were changes
   */
  commitAll(msg: string): boolean {
    // git commit -a -m "style(lint-all): $GIT_MSG" || true
    const cmd = `git commit -a --no-verify -m "${msg}"`
    // const cmd = `git`
    // const args = ['commit', '-a', '--no-verify', '-m', msg]
    console.log(cmd)

    try {
      execSync(cmd, {
        stdio: 'inherit',
      })
      return true
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
}

export const git2 = new Git2()
