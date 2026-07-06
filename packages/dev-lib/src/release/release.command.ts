import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import { _parseArgs } from '@naturalcycles/nodejs-lib/args'
import { dimGrey, white } from '@naturalcycles/nodejs-lib/colors'
import { appendToGithubOutput } from '@naturalcycles/nodejs-lib/env'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import picomatch from 'picomatch'
import { readDevLibConfigIfPresent } from '../config.js'
import { analyzeCommits, parseCommit } from './commit.util.js'
import {
  checkHeadIsUpToDateWithRemote,
  createAndPushTag,
  ensureFullGitHistory,
  getCommitsSince,
  getCurrentBranch,
  getReachableTags,
  getRepoInfo,
} from './git.util.js'
import { GithubApi } from './github.util.js'
import { generateReleaseNotes } from './notes.util.js'
import type { ReleaseChannel, ReleasePackage, ReleasePlan, RepoInfo } from './release.model.js'
import { getLastRelease, getNextVersion, getVersionsFromTags } from './version.util.js'
import { discoverReleasePackages, resolveReleaseMode } from './workspace.util.js'

/**
 * Release workspace packages (or the root package in single-repo mode):
 * analyze conventional commits since the last release tag, compute the next semver,
 * publish to npm via `pnpm publish`, push the release tag and create a GitHub Release.
 *
 * A lean replacement for semantic-release. Git tags are the source of truth for versions -
 * the package.json version bump happens in the working tree only and is never committed.
 *
 * Must be run from the repo root.
 */
export async function releaseCommand(): Promise<void> {
  const argv = _parseArgs({
    'dry-run': {
      type: 'boolean',
      default: false,
      desc: 'Compute and print the release plan without publishing anything',
    },
    filter: {
      type: 'string',
      desc: 'Only release the given package (name, name without scope, or directory)',
    },
  })
  const dryRun = argv['dry-run']

  const { release: cfg = {} } = await readDevLibConfigIfPresent()
  const stableBranches = cfg.branches || ['main', 'master']
  const prereleaseBranches = cfg.prereleaseBranches || ['beta-*']
  const successComments = cfg.successComments !== false

  const repo = getRepoInfo()
  const branch = getCurrentBranch()
  const channel = resolveChannel(branch, stableBranches, prereleaseBranches)
  if (!channel) {
    console.log(`Branch "${branch}" is not configured for release - nothing to do`)
    return
  }

  const token = process.env['GITHUB_TOKEN'] || process.env['GH_TOKEN']
  if (!dryRun) {
    _assert(token, 'GITHUB_TOKEN (or GH_TOKEN) is required to release, or use --dry-run')
  }

  ensureFullGitHistory()
  if (!dryRun) {
    checkHeadIsUpToDateWithRemote(branch)
  }

  const mode = resolveReleaseMode(cfg.mode)
  const packages = discoverReleasePackages(mode, argv.filter)
  const tags = getReachableTags()

  console.log(
    `Releasing from branch ${white(branch)} (dist-tag ${white(channel.distTag)}), ${mode} mode, ${packages.length} package(s)${dryRun ? dimGrey(' [dry-run]') : ''}`,
  )

  const released: ReleasePlan[] = []
  for (const pkg of packages) {
    const plan = planPackageRelease(pkg, tags, channel, repo)
    if (!plan) {
      console.log(dimGrey(`${pkg.name}: no release-worthy commits`))
      continue
    }

    console.log(
      white(
        `${pkg.name}: ${plan.lastRelease?.version || '(first release)'} -> ${plan.nextVersion} (${plan.releaseType}, ${plan.commits.length} commits)`,
      ),
    )
    if (dryRun) {
      console.log(dimGrey(plan.notes))
    } else {
      await executeRelease(plan, repo, { token: token!, successComments })
    }
    released.push(plan)
  }

  console.log(
    released.length
      ? `${dryRun ? 'Would release' : 'Released'}: ${released.map(p => `${p.pkg.name}@${p.nextVersion}`).join(', ')}`
      : 'Nothing to release',
  )
}

/**
 * Resolve the release channel from the current branch, or undefined if the branch
 * is not configured for release.
 */
export function resolveChannel(
  branch: string,
  stableBranches: string[],
  prereleaseBranches: string[],
): ReleaseChannel | undefined {
  if (stableBranches.includes(branch)) {
    return { distTag: 'latest' }
  }
  if (prereleaseBranches.some(glob => picomatch.isMatch(branch, glob))) {
    _assert(
      /^[0-9A-Za-z-]+$/.test(branch),
      `Branch name "${branch}" cannot be used as a prerelease identifier - only letters, numbers and dashes are allowed`,
    )
    return { distTag: branch, prereleaseId: branch }
  }
  return undefined
}

function planPackageRelease(
  pkg: ReleasePackage,
  tags: string[],
  channel: ReleaseChannel,
  repo: RepoInfo,
): ReleasePlan | null {
  const versions = getVersionsFromTags(tags, pkg.tagPrefix)
  const lastRelease = getLastRelease(versions, pkg.tagPrefix, channel)
  const commits = getCommitsSince(lastRelease?.tag, pkg.relativeDir || undefined).map(parseCommit)
  const releaseType = analyzeCommits(commits)
  if (!releaseType) return null

  const pkgJson = fs2.readJson<{ version?: string }>(`${pkg.dir}/package.json`)
  const nextVersion = getNextVersion({
    lastRelease,
    allVersions: versions,
    releaseType,
    channel,
    firstReleaseVersion: pkgJson.version,
  })
  const nextTag = `${pkg.tagPrefix}${nextVersion}`
  const notes = generateReleaseNotes({ repo, commits, lastTag: lastRelease?.tag, nextTag })

  return { pkg, lastRelease, releaseType, nextVersion, nextTag, channel, commits, notes }
}

async function executeRelease(
  plan: ReleasePlan,
  repo: RepoInfo,
  opt: { token: string; successComments: boolean },
): Promise<void> {
  const { pkg, nextVersion, nextTag, channel, notes, commits } = plan

  bumpPackageJsonVersion(pkg.dir, nextVersion)

  // Publish before tagging: a failed publish must not leave a tag behind,
  // as the tag would make the next run consider this version already released.
  // pnpm rewrites workspace:* deps and handles npm OIDC trusted publishing + provenance.
  exec2.spawn(`pnpm publish --tag ${channel.distTag} --no-git-checks`, { cwd: pkg.dir })

  createAndPushTag(nextTag, repo)

  const github = new GithubApi(repo, opt.token)
  let releaseUrl: string
  try {
    releaseUrl = await github.createRelease({
      tag: nextTag,
      notes,
      prerelease: !!channel.prereleaseId,
    })
  } catch (err) {
    throw new Error(
      `${pkg.name}@${nextVersion} was published and tagged, but GitHub Release creation failed - create it manually for tag ${nextTag}. Cause: ${err}`,
      { cause: err },
    )
  }
  console.log(`GitHub Release created: ${releaseUrl}`)

  if (opt.successComments) {
    await github.commentOnReleasedPrs(commits, { tag: nextTag, releaseUrl })
  }

  writeGithubOutputs(pkg.name, nextVersion)
}

function bumpPackageJsonVersion(dir: string, version: string): void {
  const packageJsonPath = `${dir}/package.json`
  const pkgJson = fs2.readJson<AnyObject>(packageJsonPath)
  pkgJson['version'] = version
  fs2.writeJson(packageJsonPath, pkgJson, { spaces: 2 })
}

/**
 * Expose the release result to subsequent GitHub Actions steps,
 * e.g. `shared_released=true`, `shared_version=7.660.0`.
 */
function writeGithubOutputs(pkgName: string, version: string): void {
  const key = pkgName
    .split('/')
    .pop()!
    .replaceAll(/[^a-zA-Z0-9_]/g, '_')
  appendToGithubOutput({
    [`${key}_released`]: 'true',
    [`${key}_version`]: version,
  })
}
