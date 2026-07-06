import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { dimGrey } from '@naturalcycles/nodejs-lib/colors'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import type { RawCommit, RepoInfo } from './release.model.js'

/**
 * Parse the `origin` remote into owner/repo.
 * Supports both `git@github.com:Owner/repo.git` and `https://github.com/Owner/repo(.git)` remotes.
 */
export function getRepoInfo(): RepoInfo {
  const url = exec2.exec('git remote get-url origin').trim()
  const match = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/)
  _assert(match, `Cannot parse GitHub repo from origin url: ${url}`)
  const [, owner, repo] = match
  return { owner: owner!, repo: repo!, url: `https://github.com/${owner}/${repo}` }
}

export function getCurrentBranch(): string {
  const branch = exec2.exec('git rev-parse --abbrev-ref HEAD').trim()
  if (branch !== 'HEAD') return branch
  // Detached HEAD (some CI checkouts) - fall back to the GitHub Actions ref
  const { GITHUB_REF_NAME } = process.env
  _assert(GITHUB_REF_NAME, 'Cannot determine current git branch (detached HEAD)')
  return GITHUB_REF_NAME
}

/**
 * Make sure the full git history and all tags are available:
 * CI checkouts are often shallow and without tags, while release calculation is based on tags.
 *
 * On a complete (non-shallow) clone a failed fetch is tolerated with a warning (e.g. offline
 * local dry-run) - the local tags are complete enough. On a shallow clone a failed unshallow
 * is fatal: a truncated history hides release tags and would make a released package look like
 * a first release, publishing a wrong version.
 */
export function ensureFullGitHistory(repo: RepoInfo): void {
  // Fetch from an authenticated url, not `origin`: private repos reject unauthenticated fetches,
  // and CI checkouts don't persist git credentials (persist-credentials: false).
  const remote = getAuthenticatedRemote(repo)
  const shallow = exec2.exec('git rev-parse --is-shallow-repository').trim() === 'true'

  if (shallow) {
    console.log(dimGrey('git fetch --unshallow --tags'))
    try {
      exec2.exec(`git fetch --unshallow --tags --quiet "${remote}"`)
    } catch {
      // Sanitized: the original error contains the failed command incl. the token
      throw new Error(
        'git fetch --unshallow failed - refusing to release with a shallow git history, as version calculation depends on it',
      )
    }
  } else {
    console.log(dimGrey('git fetch --tags'))
    try {
      exec2.exec(`git fetch --tags --quiet "${remote}"`)
    } catch {
      console.log(dimGrey('git fetch --tags failed, continuing with local tags/history'))
    }
  }
}

/**
 * Abort if someone pushed to the branch since this checkout - releasing from a stale HEAD
 * would compute wrong versions/notes. No-op if the branch has no remote counterpart.
 */
export function checkHeadIsUpToDateWithRemote(branch: string, repo: RepoInfo): void {
  const remote = getAuthenticatedRemote(repo)
  let remoteSha: string | undefined
  try {
    remoteSha = exec2
      .exec(`git ls-remote "${remote}" "refs/heads/${branch}"`)
      .split('\t')[0]
      ?.trim()
  } catch {
    console.log(dimGrey('git ls-remote failed, skipping up-to-date check'))
    return
  }
  if (!remoteSha) return
  const headSha = exec2.exec('git rev-parse HEAD').trim()
  _assert(
    remoteSha === headSha,
    `Local HEAD (${headSha.slice(0, 7)}) is not up to date with remote ${branch} (${remoteSha.slice(0, 7)}) - aborting release`,
  )
}

/**
 * All git tags reachable from HEAD.
 * Reachability matters: on a prerelease branch this naturally excludes tags of other
 * prerelease branches, matching semantic-release (which uses `git tag --merged`).
 */
export function getReachableTags(): string[] {
  return exec2
    .exec('git tag --merged HEAD')
    .split('\n')
    .map(t => t.trim())
    .filter(Boolean)
}

/**
 * Commits since the given tag (or all history when no tag), newest first,
 * optionally limited to the given directory (monorepo mode).
 */
export function getCommitsSince(tag: string | undefined, relativeDir?: string): RawCommit[] {
  // %x1f (unit separator) between fields, %x1e (record separator) between commits
  const range = tag ? `"${tag}..HEAD"` : 'HEAD'
  const pathFilter = relativeDir ? ` -- "${relativeDir}"` : ''
  const out = exec2.exec(`git log --format="%H%x1f%s%x1f%b%x1e" ${range}${pathFilter}`)

  return out
    .split('\u001E')
    .map(record => record.trim())
    .filter(Boolean)
    .map(record => {
      const [hash = '', subject = '', body = ''] = record.split('\u001F')
      return { hash, subject, body: body.trim() }
    })
    .filter(c => c.hash)
}

/**
 * Create the release tag on HEAD and push it to origin.
 */
export function createAndPushTag(tag: string, repo: RepoInfo): void {
  exec2.exec(`git tag "${tag}"`)
  try {
    exec2.exec(`git push "${getAuthenticatedRemote(repo)}" "refs/tags/${tag}"`)
  } catch {
    // Sanitized rethrow: the original error message contains the failed command incl. the token
    throw new Error(`Failed to push tag ${tag} to origin`)
  }
}

/**
 * Token-authenticated remote url when GITHUB_TOKEN is available, `origin` otherwise.
 * CI checkouts don't persist git credentials (persist-credentials: false), so all remote
 * git operations (fetch, ls-remote, push) go through this.
 * NEVER log commands containing this url, and sanitize their errors - they carry the token.
 */
function getAuthenticatedRemote(repo: RepoInfo): string {
  const token = process.env['GITHUB_TOKEN'] || process.env['GH_TOKEN']
  return token
    ? `https://x-access-token:${token}@github.com/${repo.owner}/${repo.repo}.git`
    : 'origin'
}
