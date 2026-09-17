import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { describe, expect, test } from 'vitest'
import { tmpDir } from '../paths.js'
import type { ReleasePackage } from './release.model.js'
import {
  filterReleasePackages,
  setPackageJsonVersion,
  syncWorkspaceVersionsFromTags,
} from './workspace.util.js'

const packages: ReleasePackage[] = [
  { name: '@scope/a', dir: '/repo/packages/a', relativeDir: 'packages/a', tagPrefix: '@scope/a-v' },
  { name: '@scope/b', dir: '/repo/packages/b', relativeDir: 'packages/b', tagPrefix: '@scope/b-v' },
]

describe('filterReleasePackages', () => {
  test('should match by name, unscoped name and directory', () => {
    expect(filterReleasePackages(packages, '@scope/a')).toEqual([packages[0]])
    expect(filterReleasePackages(packages, 'a')).toEqual([packages[0]])
    expect(filterReleasePackages(packages, 'packages/b')).toEqual([packages[1]])
  })

  test('should throw when nothing matches', () => {
    expect(() => filterReleasePackages(packages, 'c')).toThrow('matched none')
  })
})

describe('syncWorkspaceVersionsFromTags', () => {
  test('should write the highest stable tagged version of every package', async () => {
    const { root, pkgs, readVersion } = createWorkspace({
      a: '0.0.0',
      b: '0.0.0',
      c: '0.0.0',
    })
    try {
      syncWorkspaceVersionsFromTags(pkgs, [
        'a-v1.0.0',
        'a-v1.2.0',
        'a-v2.0.0-beta-x.1', // prerelease: never synced
        'b-v3.4.5',
        'not-a-tag',
        'c-v0.1.0-beta-x.1', // c has no stable release
      ])

      expect(readVersion('a')).toBe('1.2.0')
      expect(readVersion('b')).toBe('3.4.5')
      expect(readVersion('c')).toBe('0.0.0') // never released stable, so left alone
    } finally {
      fs2.removePath(root)
    }
  })
})

describe('setPackageJsonVersion', () => {
  test('should report whether the file changed', () => {
    const { root, pkgs, readVersion } = createWorkspace({ a: '1.0.0' })
    try {
      const dir = pkgs[0]!.dir

      expect(setPackageJsonVersion(dir, '1.0.0')).toBe(false)
      expect(setPackageJsonVersion(dir, '1.1.0')).toBe(true)
      expect(readVersion('a')).toBe('1.1.0')
    } finally {
      fs2.removePath(root)
    }
  })
})

function createWorkspace(versionByName: Record<string, string>): {
  root: string
  pkgs: ReleasePackage[]
  readVersion: (name: string) => string | undefined
} {
  const root = `${tmpDir}/workspace.util.test`
  fs2.emptyDir(root)

  const pkgs = Object.entries(versionByName).map(([name, version]) => {
    const dir = `${root}/packages/${name}`
    fs2.outputJson(`${dir}/package.json`, { name, version }, { spaces: 2 })
    return { name, dir, relativeDir: `packages/${name}`, tagPrefix: `${name}-v` }
  })

  return {
    root,
    pkgs,
    readVersion: name =>
      fs2.readJson<{ version?: string }>(`${root}/packages/${name}/package.json`).version,
  }
}
