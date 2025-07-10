import type { BuildInfo } from '@naturalcycles/js-lib'
import { localTime } from '@naturalcycles/js-lib/datetime'
import { _filterUndefinedValues } from '@naturalcycles/js-lib/object'
import type { AnyObject, UnixTimestamp } from '@naturalcycles/js-lib/types'
import { fs2 } from '../fs/fs2.js'
import { git2 } from './git2.js'

export interface GenerateBuildInfoOptions {
  /**
   * If set - this timestamp will be used, instead of "current time".
   */
  overrideTimestamp?: UnixTimestamp

  /**
   * Defaults to currently checked out git branch.
   */
  overrideBranchName?: string
}

export function generateBuildInfo(opt: GenerateBuildInfoOptions = {}): BuildInfo {
  const now = localTime.orNow(opt.overrideTimestamp)
  const ts = now.unix

  const rev = git2.getCurrentCommitSha()
  const branchName = opt.overrideBranchName || git2.getCurrentBranchName()
  const repoName = git2.getCurrentRepoName()
  const tsCommit = git2.getCurrentCommitTimestamp()

  const ver = [now.toStringCompact(), repoName, branchName, rev].join('_')

  let { APP_ENV: env } = process.env

  if (!env) {
    // Attempt to read `envByBranch` from package.json root
    try {
      if (fs2.pathExists('package.json')) {
        const packageJson = fs2.readJson<AnyObject>('package.json')
        env = packageJson?.['envByBranch']?.[branchName] || packageJson?.['envByBranch']?.['*']
      }
    } catch {}
  }

  return _filterUndefinedValues({
    ts,
    tsCommit,
    repoName,
    branchName,
    rev,
    ver,
    env,
  })
}
