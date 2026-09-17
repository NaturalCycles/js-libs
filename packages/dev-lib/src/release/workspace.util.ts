import path from 'node:path'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import { dimGrey } from '@naturalcycles/nodejs-lib/colors'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import type { ReleasePackage } from './release.model.js'
import { getLastRelease, getVersionsFromTags } from './version.util.js'

export type ReleaseMode = 'monorepo' | 'single'

/**
 * Detect the release mode: 'monorepo' when a pnpm workspace is present, 'single' otherwise.
 */
export function resolveReleaseMode(configured?: ReleaseMode): ReleaseMode {
  return configured || (fs2.pathExists('pnpm-workspace.yaml') ? 'monorepo' : 'single')
}

/**
 * Discover the packages to release. Must be run from the repo root.
 *
 * - monorepo: every non-private workspace package, tagged as `<name>-v<version>`
 * - single: the root package, tagged as `v<version>`
 */
export function discoverReleasePackages(mode: ReleaseMode): ReleasePackage[] {
  if (mode === 'monorepo') return discoverWorkspacePackages()
  return [getRootPackage()]
}

function discoverWorkspacePackages(): ReleasePackage[] {
  const root = process.cwd()
  const out = exec2.exec('pnpm -r ls --depth -1 --json')
  const list: { name?: string; path: string; private?: boolean }[] = JSON.parse(out)

  return list
    .filter(p => p.name && !p.private && p.path !== root)
    .map(p => ({
      name: p.name!,
      dir: p.path,
      relativeDir: path.relative(root, p.path),
      tagPrefix: `${p.name}-v`,
    }))
}

function getRootPackage(): ReleasePackage {
  const dir = process.cwd()
  const pkg = fs2.readJson<{ name?: string; private?: boolean }>(`${dir}/package.json`)
  _assert(pkg.name, 'package.json has no "name" - cannot release')
  _assert(!pkg.private, `${pkg.name} is private - cannot release`)
  return {
    name: pkg.name,
    dir,
    relativeDir: '',
    tagPrefix: 'v',
  }
}

/**
 * Narrow the release packages down to the one matching the filter
 * (name, name without scope, or directory relative to the repo root).
 */
export function filterReleasePackages(
  packages: ReleasePackage[],
  filter: string,
): ReleasePackage[] {
  const filtered = packages.filter(
    p => p.name === filter || p.name.split('/').pop() === filter || p.relativeDir === filter,
  )
  _assert(
    filtered.length,
    `--filter "${filter}" matched none of the release packages: ${packages.map(p => p.name).join(', ')}`,
  )
  return filtered
}

/**
 * Sync every workspace package's package.json version to its latest released version (from git tags).
 */
export function syncWorkspaceVersionsFromTags(packages: ReleasePackage[], tags: string[]): void {
  const synced: string[] = []

  for (const pkg of packages) {
    const versions = getVersionsFromTags(tags, pkg.tagPrefix)
    const lastRelease = getLastRelease(versions, pkg.tagPrefix, { distTag: 'latest' })
    if (!lastRelease) continue
    if (setPackageJsonVersion(pkg.dir, lastRelease.version)) {
      synced.push(`${pkg.name}@${lastRelease.version}`)
    }
  }

  if (synced.length) {
    console.log(dimGrey(`Synced workspace versions from tags: ${synced.join(', ')}`))
  }
}

/**
 * Set the version in the package.json of the given directory.
 * Returns true if the file was changed.
 */
export function setPackageJsonVersion(dir: string, version: string): boolean {
  const packageJsonPath = `${dir}/package.json`
  const pkgJson = fs2.readJson<AnyObject>(packageJsonPath)
  if (pkgJson['version'] === version) return false
  pkgJson['version'] = version
  fs2.writeJson(packageJsonPath, pkgJson, { spaces: 2 })
  return true
}
