import { exec2, fs2, kpySync } from '@naturalcycles/nodejs-lib'
import { findPackageBinPath } from './lint.util.js'

export async function buildProd(): Promise<void> {
  fs2.emptyDir('./dist') // it doesn't delete the dir itself, to prevent IDE jumping
  buildCopy()
  await runTSCProd()
}

/**
 * Use 'tsconfig.json' to indicate root.
 */
export async function runTSCInFolders(
  tsconfigPaths: string[],
  args: string[] = [],
  parallel = true,
): Promise<void> {
  if (parallel) {
    await Promise.all(tsconfigPaths.map(p => runTSCInFolder(p, args)))
  } else {
    for (const p of tsconfigPaths) {
      await runTSCInFolder(p, args)
    }
  }
}

/**
 * Pass 'tsconfig.json' to run in root.
 */
export async function runTSCInFolder(tsconfigPath: string, args: string[] = []): Promise<void> {
  if (!fs2.pathExists(tsconfigPath)) {
    // console.log(`Skipping to run tsc for ${tsconfigPath}, as it doesn't exist`)
    return
  }

  const tscPath = findPackageBinPath('typescript', 'tsc')

  await exec2.spawnAsync(tscPath, {
    args: ['-P', tsconfigPath, ...args],
    shell: false,
  })
}

export async function runTSCProd(args: string[] = []): Promise<void> {
  const tsconfigPath = [`./tsconfig.prod.json`].find(p => fs2.pathExists(p)) || 'tsconfig.json'

  const tscPath = findPackageBinPath('typescript', 'tsc')

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
