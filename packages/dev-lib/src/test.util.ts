import type { AnyObject } from '@naturalcycles/js-lib'
import { _uniq } from '@naturalcycles/js-lib'
import { dimGrey, exec2, fs2 } from '@naturalcycles/nodejs-lib'
import { findPackageBinPath } from './lint.util.js'

interface RunTestOptions {
  integration?: boolean
  manual?: boolean
  leaks?: boolean
}

export function runTest(opt: RunTestOptions = {}): void {
  // if (nodeModuleExists('vitest')) {
  if (fs2.pathExists('vitest.config.ts')) {
    runVitest(opt)
    return
  }

  console.log(dimGrey(`vitest.config.ts not found, skipping tests`))
}

function runVitest(opt: RunTestOptions): void {
  const { integration, manual } = opt
  const processArgs = process.argv.slice(3)
  const args: string[] = [...processArgs]
  const env: AnyObject = {}
  if (integration) {
    Object.assign(env, {
      TEST_TYPE: 'integration',
    })
  } else if (manual) {
    Object.assign(env, {
      TEST_TYPE: 'manual',
    })
  }

  const vitestPath = findPackageBinPath('vitest', 'vitest')

  exec2.spawn(vitestPath, {
    args: _uniq(args),
    logFinish: false,
    shell: false,
    env,
  })
}

/**
 * Returns true if module with given name exists in _target project's_ node_modules.
 */
// function nodeModuleExists(moduleName: string): boolean {
//   return existsSync(`./node_modules/${moduleName}`)
// }
