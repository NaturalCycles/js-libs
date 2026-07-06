import path from 'node:path'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import type { ReleasePackage } from './release.model.js'

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
export function discoverReleasePackages(mode: ReleaseMode, filter?: string): ReleasePackage[] {
  const packages = mode === 'monorepo' ? discoverWorkspacePackages() : [getRootPackage()]

  if (!filter) return packages
  const filtered = packages.filter(
    p => p.name === filter || p.name.split('/').pop() === filter || p.relativeDir === filter,
  )
  _assert(
    filtered.length,
    `--filter "${filter}" matched none of the release packages: ${packages.map(p => p.name).join(', ')}`,
  )
  return filtered
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
