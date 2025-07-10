import os from 'node:os'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { pDelay } from '@naturalcycles/js-lib/promise'
import { setGlobalStringifyFunction } from '@naturalcycles/js-lib/string'
import type { AnyObject } from '@naturalcycles/js-lib/types'
import { inspectStringifyFn } from '../string/inspect.js'

export interface RunScriptOptions {
  /**
   * @default false
   * Set to true to NOT call process.exit(0) after function is completed.
   * Currently it exists because of `jest --maxWorkers=1` behavior. To be investigated more..
   */
  noExit?: boolean

  /**
   * Default to `console`
   */
  logger?: CommonLogger

  /**
   * Defaults to true.
   * Set to false if you already have your handlers elsewhere and don't need them here.
   */
  registerUncaughtExceptionHandlers?: boolean
}

const { DEBUG_RUN_SCRIPT } = process.env

/**
 * Use it in your top-level scripts like this:
 *
 * runScript(async () => {
 *   await lalala()
 *   // my script goes on....
 * })
 *
 * Advantages:
 * - Works kind of like top-level await
 * - No need to add `void`
 * - No need to add `.then(() => process.exit()` (e.g to close DB connections)
 * - No need to add `.catch(err => { console.error(err); process.exit(1) })`
 *
 * This function is kept light, dependency-free, exported separately.
 *
 * Set env DEBUG_RUN_SCRIPT for extra debugging.
 */
export function runScript(fn: (...args: any[]) => any, opt: RunScriptOptions = {}): void {
  setGlobalStringifyFunction(inspectStringifyFn)

  const { logger = console, noExit, registerUncaughtExceptionHandlers = true } = opt

  if (registerUncaughtExceptionHandlers || DEBUG_RUN_SCRIPT) {
    process.on('uncaughtException', err => {
      logger.error('runScript uncaughtException:', err)
    })
    process.on('unhandledRejection', err => {
      logger.error('runScript unhandledRejection:', err)
    })
  }

  if (DEBUG_RUN_SCRIPT) {
    process.on('exit', code => logger.log(`process.exit event, code=${code}`))
    process.on('beforeExit', code => logger.log(`process.beforeExit event, code=${code}`))
  }

  // fake timeout, to ensure node.js process won't exit until runScript main promise is resolved
  const timeout = setTimeout(() => {}, 10000000)

  void (async () => {
    try {
      await import('dotenv/config')
      await checkAndlogEnvironment()

      await fn()

      await pDelay() // to ensure all async operations are completed

      if (DEBUG_RUN_SCRIPT) logger.log(`runScript promise resolved`)

      if (!noExit) {
        setImmediate(() => process.exit(0))
      }
    } catch (err) {
      logger.error('runScript error:', err)
      process.exitCode = 1
      if (!noExit) {
        setImmediate(() => process.exit(1))
      }
    } finally {
      clearTimeout(timeout)
    }
  })()
}

async function checkAndlogEnvironment(): Promise<void> {
  const { dimGrey } = await import('../colors/colors.js')

  const {
    platform,
    arch,
    versions: { node },
    env: { CPU_LIMIT, NODE_OPTIONS, TZ },
  } = process

  const cpuLimit = Number(CPU_LIMIT) || undefined
  const availableParallelism = os.availableParallelism?.()
  const cpus = os.cpus().length
  console.log(
    dimGrey(
      formatObject({
        node: `${node} ${platform} ${arch}`,
        cpus,
        availableParallelism,
        cpuLimit,
      }) +
        '\n' +
        formatObject({
          NODE_OPTIONS: NODE_OPTIONS || 'not defined',
          TZ: TZ || 'not defined',
        }),
    ),
  )

  if (!NODE_OPTIONS) {
    console.warn(
      `NODE_OPTIONS env variable is not defined. You may run into out-of-memory issues when running memory-intensive scripts. It's recommended to set it to:\n--max-old-space-size=12000`,
    )
  } else if (NODE_OPTIONS.includes('max_old')) {
    console.warn(
      `It looks like you're using "max_old_space_size" syntax with underscores instead of dashes - it's WRONG and doesn't work in environment variables. Strongly advised to rename it to "max-old-space-size"`,
    )
  }

  // if (!TZ) {
  //   console.error(
  //     [
  //       '!!! TZ environment variable is required to be set, but was not set.',
  //       'The runScript will exit and not continue further because of that,',
  //       'please ensure the TZ variable and try again.',
  //       'If you are running locally, you can add TZ=UTC to the local .env file.',
  //     ].join('\n'),
  //   )
  //   process.exit(1)
  // }
}

function formatObject(obj: AnyObject): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
}
