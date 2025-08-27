import { execSync, spawn, spawnSync } from 'node:child_process'
import { _since } from '@naturalcycles/js-lib/datetime/time.util.js'
import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import { _substringAfterLast } from '@naturalcycles/js-lib/string/string.util.js'
import type {
  AnyObject,
  NumberOfMilliseconds,
  UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
import { dimGrey, dimRed, hasColors, white } from '../colors/colors.js'

/**
 * Set of utility functions to work with Spawn / Exec.
 *
 * How to decide between Spawn and Exec?
 *
 * Long-running job that prints output, and no need to return the output - use Spawn.
 *
 * Short-running job, no need to print the output, might want to return the output - use Exec.
 *
 * Need to both print and return the output - use SpawnAsyncAndReturn.
 *
 * ***
 *
 * Spawn is good for long-running large-output processes, that continuously output data.
 * E.g running `jest`.
 *
 * Exec is the opposite - good for short-running processes that output small data.
 * Exec allows to return the output as a string.
 * Exec doesn't stream data during execution, so the output/error will only be printed
 * at the end.
 * Exec always uses the shell (there's no option to disable it).
 */
class Exec2 {
  /**
   * Reasons to use it:
   * - Sync
   * - Need to print output while running
   *
   * Limitations:
   * - Cannot return stdout/stderr (use exec, execAsync or spawnAsyncAndReturn for that)
   *
   * Defaults:
   *
   * shell: true
   * log: true
   */
  spawn(cmd: string, opt: SpawnOptions = {}): void {
    const { shell = true, cwd, env, passProcessEnv = true, forceColor = hasColors } = opt
    opt.log ??= true // by default log should be true, as we are printing the output
    opt.logStart ??= opt.log
    opt.logFinish ??= opt.log
    const started = Date.now() as UnixTimestampMillis
    this.logStart(cmd, opt)

    const r = spawnSync(cmd, opt.args, {
      encoding: 'utf8',
      stdio: 'inherit',
      shell,
      cwd,
      env: {
        ...(passProcessEnv ? process.env : {}),
        ...(forceColor ? { FORCE_COLOR: '1' } : {}),
        ...env,
      },
    })

    const isSuccessful = !r.error && !r.status
    this.logFinish(cmd, opt, started, isSuccessful)

    if (r.error) {
      throw r.error
    }
    if (r.status) {
      throw new Error(`spawn exited with code ${r.status}: ${cmd}`)
    }
  }

  /**
   * Reasons to use it:
   *
   * - Sync
   * - Need to return output
   *
   * Limitations:
   * - Cannot print while running (use spawn or spawnAsync for that)
   *
   * Defaults:
   *
   * shell: true
   * log: false
   */
  exec(cmd: string, opt: ExecOptions = {}): string {
    const { cwd, env, passProcessEnv = true, timeout } = opt
    opt.logStart ??= opt.log ?? false
    opt.logFinish ??= opt.log ?? false
    const started = Date.now() as UnixTimestampMillis
    this.logStart(cmd, opt)

    try {
      const s = execSync(cmd, {
        encoding: 'utf8',
        // stdio: 'inherit', // no, otherwise we don't get the output returned
        stdio: undefined,
        // shell: undefined,
        cwd,
        timeout,
        env: {
          ...(passProcessEnv ? process.env : {}),
          ...env,
        },
      }).trim()

      this.logFinish(cmd, opt, started, true)
      return s
    } catch (err) {
      // Not logging stderr, as it's printed by execSync by default (somehow)
      // stdout is not printed by execSync though, therefor we print it here
      // if ((err as any).stderr) {
      //   process.stderr.write((err as any).stderr)
      // }
      if ((err as any).stdout) {
        process.stdout.write((err as any).stdout)
      }
      this.logFinish(cmd, opt, started, false)
      throw new Error(`exec exited with code ${(err as any).status}: ${cmd}`)
    }
  }

  /**
   * Reasons to use it:
   * - Async
   * - Need to print output while running
   *
   * Limitations:
   * - Cannot return stdout/stderr (use execAsync or spawnAsyncAndReturn for that)
   *
   * Defaults:
   *
   * shell: true
   * log: true
   */
  async spawnAsync(cmd: string, opt: SpawnOptions = {}): Promise<void> {
    const { shell = true, cwd, env, passProcessEnv = true, forceColor = hasColors } = opt
    opt.log ??= true // by default log should be true, as we are printing the output
    opt.logStart ??= opt.log
    opt.logFinish ??= opt.log
    const started = Date.now() as UnixTimestampMillis
    this.logStart(cmd, opt)

    await new Promise<void>((resolve, reject) => {
      const p = spawn(cmd, opt.args || [], {
        shell,
        cwd,
        stdio: 'inherit',
        env: {
          ...(passProcessEnv ? process.env : {}),
          ...(forceColor ? { FORCE_COLOR: '1' } : {}),
          ...env,
        },
      })

      p.on('close', code => {
        const isSuccessful = !code
        this.logFinish(cmd, opt, started, isSuccessful)
        if (code) {
          return reject(new Error(`spawnAsync exited with code ${code}: ${cmd}`))
        }
        resolve()
      })

      // Important to have this error listener.
      // Without it - the process hangs, and `close` is never emitted
      p.on('error', err => {
        console.error(err)
      })
    })
  }

  /**
   * Advanced/async version of Spawn.
   * Consider simpler `spawn` or `exec` first, which are also sync.
   *
   * spawnAsyncAndReturn features:
   *
   * 1. Async
   * 2. Allows to collect the output AND print it while running.
   * 3. Returns SpawnOutput with stdout, stderr and exitCode.
   * 4. Allows to not throw on error, but just return SpawnOutput for further inspection.
   *
   * Defaults:
   *
   * shell: true
   * printWhileRunning: true
   * collectOutputWhileRunning: true
   * throwOnNonZeroCode: true
   * log: true
   */
  async spawnAsyncAndReturn(cmd: string, opt: SpawnAsyncOptions = {}): Promise<SpawnOutput> {
    const {
      shell = true,
      printWhileRunning = true,
      collectOutputWhileRunning = true,
      throwOnNonZeroCode = true,
      cwd,
      env,
      passProcessEnv = true,
      forceColor = hasColors,
    } = opt
    opt.log ??= printWhileRunning // by default log should be true, as we are printing the output
    opt.logStart ??= opt.log
    opt.logFinish ??= opt.log
    const started = Date.now() as UnixTimestampMillis
    this.logStart(cmd, opt)
    let stdout = ''
    let stderr = ''

    return await new Promise<SpawnOutput>((resolve, reject) => {
      const p = spawn(cmd, opt.args || [], {
        shell,
        cwd,
        env: {
          ...(passProcessEnv ? process.env : {}),
          ...(forceColor ? { FORCE_COLOR: '1' } : {}),
          ...env,
        },
      })

      p.stdout.on('data', data => {
        if (collectOutputWhileRunning) {
          stdout += data.toString()
          // console.log('stdout:', data.toString())
        }
        if (printWhileRunning) {
          process.stdout.write(data)
          // console.log('stderr:', data.toString())
        }
      })
      p.stderr.on('data', data => {
        if (collectOutputWhileRunning) {
          stderr += data.toString()
        }
        if (printWhileRunning) {
          process.stderr.write(data)
        }
      })

      p.on('close', code => {
        const isSuccessful = !code
        this.logFinish(cmd, opt, started, isSuccessful)
        const exitCode = code || 0
        const o: SpawnOutput = {
          exitCode,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        }
        if (throwOnNonZeroCode && code) {
          return reject(new SpawnError(`spawnAsyncAndReturn exited with code ${code}: ${cmd}`, o))
        }
        resolve(o)
      })

      // Important to have this error listener.
      // Without it - the process hangs, and `close` is never emitted
      p.on('error', err => {
        console.error(err)
      })
    })
  }

  private logStart(cmd: string, opt: SpawnOptions | ExecOptions): void {
    if (!opt.logStart) return

    const envString = Object.entries(opt.env || {})
      .map(([k, v]) => [k, v].join('='))
      .join(' ')

    if (opt.name) {
      console.log(
        ['  ', dimGrey(envString), white(opt.name), dimGrey('started...')]
          .filter(Boolean)
          .join(' '),
      )
    } else {
      console.log(
        [
          '  ',
          dimGrey(envString),
          white(_substringAfterLast(cmd, '/')),
          ...((opt as SpawnOptions).args || []),
        ]
          .filter(Boolean)
          .join(' '),
      )
    }
  }

  private logFinish(
    cmd: string,
    opt: SpawnOptions | ExecOptions,
    started: UnixTimestampMillis,
    isSuccessful: boolean,
  ): void {
    if (isSuccessful && !opt.logFinish) return

    console.log(
      [
        isSuccessful ? ' ✓' : ' ×',
        white(opt.name || _substringAfterLast(cmd, '/')),
        ...((!opt.name && (opt as SpawnOptions).args) || []),
        dimGrey('took ' + _since(started)),
        !isSuccessful && dimGrey('and ') + dimRed('failed'),
      ]
        .filter(Boolean)
        .join(' '),
    )
  }
}

export const exec2 = new Exec2()

export class SpawnError extends AppError<SpawnErrorData> {
  constructor(message: string, data: SpawnErrorData) {
    super(message, data, { name: 'SpawnError' })
  }
}

export interface SpawnErrorData extends SpawnOutput {}

export interface SpawnOutput {
  /**
   * Exit code of the spawned process.
   * 0 means success, anything else means failure.
   */
  exitCode: number
  stdout: string
  stderr: string
}

export interface SpawnAsyncOptions extends SpawnOptions {
  /**
   * Defaults to true.
   * If true - prints both stdout and stderr to console while running,
   * otherwise runs "silently".
   * Returns SpawnOutput in the same way, regardless of `printWhileRunning` setting.
   */
  printWhileRunning?: boolean

  /**
   * Defaults to true.
   * If true - collects stdout and stderr while running, and return it in the end.
   * stdout/stderr are collected and returned regardless if it returns with error or not.
   * On success - stdout/stderr are available from `SpawnOutput`.
   * On error - stdout/stderr are available from `SpawnError.data`.
   */
  collectOutputWhileRunning?: boolean

  /**
   * Defaults to true.
   * If true - throws SpawnError if non-zero code is returned.
   * SpawnError conveniently contains .data.stdout and .data.strerr for inspection.
   * If false - will not throw, but return SpawnOutput with stdout, stderr and exitCode.
   */
  throwOnNonZeroCode?: boolean
}

export interface SpawnOptions {
  args?: string[]
  /**
   * Defaults to true.
   */
  logStart?: boolean
  /**
   * Defaults to true.
   */
  logFinish?: boolean
  /**
   * Defaults to true.
   * Controls/overrides both logStart and logFinish simultaneously.
   */
  log?: boolean
  /**
   * Defaults to true.
   */
  shell?: boolean

  /**
   * If specified - will be used as "command name" for logging purposes,
   * instead of "cmd + args"
   */
  name?: string
  cwd?: string

  env?: AnyObject
  /**
   * Defaults to true.
   * Set to false to NOT pass `process.env` to the spawned process.
   */
  passProcessEnv?: boolean
  /**
   * Defaults to "auto detect colors".
   * Set to false or true to override.
   */
  forceColor?: boolean
}

export interface ExecOptions {
  /**
   * Defaults to false.
   */
  logStart?: boolean
  /**
   * Defaults to false.
   */
  logFinish?: boolean
  /**
   * Defaults to false.
   * Controls/overrides both logStart and logFinish simultaneously.
   */
  log?: boolean

  /**
   * If specified - will be used as "command name" for logging purposes,
   * instead of "cmd + args"
   */
  name?: string
  cwd?: string
  timeout?: NumberOfMilliseconds

  env?: AnyObject
  /**
   * Defaults to false for security reasons.
   * Set to true to pass `process.env` to the spawned process.
   */
  passProcessEnv?: boolean
}
