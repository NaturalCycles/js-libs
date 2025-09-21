import { existsSync } from 'node:fs'
import { dimGrey } from '@naturalcycles/nodejs-lib/colors'
import { exec2 } from '@naturalcycles/nodejs-lib/exec2'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { kpySync } from '@naturalcycles/nodejs-lib/kpy'
import { findPackageBinPath } from './lint.util.js'

export async function buildProd(): Promise<void> {
  // fs2.emptyDir('./dist') // it doesn't delete the dir itself, to prevent IDE jumping
  buildCopy()
  await runTSCProd()
}

/**
 * Use 'src' to indicate root.
 */
export async function runTSCInFolders(
  dirs: string[],
  args: string[] = [],
  parallel = true,
): Promise<void> {
  if (parallel) {
    await Promise.all(dirs.map(dir => runTSCInFolder(dir, args)))
  } else {
    for (const dir of dirs) {
      await runTSCInFolder(dir, args)
    }
  }
}

/**
 * Pass 'src' to run in root.
 */
export async function runTSCInFolder(dir: string, args: string[] = []): Promise<void> {
  let configDir = dir
  if (dir === 'src') {
    configDir = ''
  }
  const tsconfigPath = [configDir, 'tsconfig.json'].filter(Boolean).join('/')

  if (!fs2.pathExists(tsconfigPath) || !fs2.pathExists(dir)) {
    // console.log(`Skipping to run tsc for ${tsconfigPath}, as it doesn't exist`)
    return
  }

  const tscPath = findPackageBinPath('typescript', 'tsc')
  const cacheLocation = `node_modules/.cache/${dir}.tsbuildinfo`
  const cacheFound = existsSync(cacheLocation)
  console.log(dimGrey(`${check(cacheFound)}tsc ${dir} cache found: ${cacheFound}`))

  await exec2.spawnAsync(tscPath, {
    args: ['-P', tsconfigPath, ...args],
    shell: false,
  })
}

export async function runTSCProd(args: string[] = []): Promise<void> {
  const tsconfigPath = [`./tsconfig.prod.json`].find(p => fs2.pathExists(p)) || 'tsconfig.json'

  const tscPath = findPackageBinPath('typescript', 'tsc')
  const cacheLocation = `node_modules/.cache/src.tsbuildinfo`
  const cacheFound = existsSync(cacheLocation)
  console.log(dimGrey(`   tsc src cache found: ${cacheFound}`))

  await exec2.spawnAsync(tscPath, {
    args: ['-P', tsconfigPath, '--noEmit', 'false', '--noCheck', ...args],
    shell: false,
  })
}

export function buildCopy(): void {
  const baseDir = 'src'
  const inputPatterns = [
    '**',
    '!**/*.ts',
    '!**/__snapshots__',
    '!**/__exclude',
    '!test',
    '!**/*.test.js',
  ]
  const outputDir = 'dist'

  kpySync({
    baseDir,
    inputPatterns,
    outputDir,
    dotfiles: true,
  })
}

function check(predicate: any): string {
  return predicate ? ' ✓ ' : '   '
}
