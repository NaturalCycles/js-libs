import type { CommonLogger } from './log/commonLogger.js'
import type { NumberOfMilliseconds } from './types.js'

class AsyncManagerImpl {
  logger: CommonLogger = console

  pendingOps = new Set<Promise<unknown>>()

  private onErrorHooks: OnErrorHook[] = []

  runInBackground(promise: Promise<unknown>): void {
    const wrappedPromise = promise
      .catch(err => this.fireOnErrorHooks(err))
      .finally(() => this.pendingOps.delete(wrappedPromise))
    this.pendingOps.add(wrappedPromise)
  }

  onError(fn: OnErrorHook): void {
    this.onErrorHooks.push(fn)
  }

  /**
   * Resolves when all pending operations settle.
   * They may resolve or reject, allDone will never throw.
   * Errors (rejections) are reported to onErrorHooks (instead).
   *
   * If timeout is specified - it resolves if timeout has reached.
   */
  async allDone(timeout?: NumberOfMilliseconds): Promise<void> {
    const { size } = this.pendingOps
    if (!size) return
    const { logger } = this

    const started = Date.now()
    if (timeout) {
      const result = await Promise.race([
        Promise.allSettled(this.pendingOps),
        new Promise<'timeout'>(resolve => setTimeout(resolve, timeout, 'timeout')),
      ])
      if (result === 'timeout') {
        logger.warn(
          `AsyncManager.allDone timed out after ${timeout} ms with ${this.pendingOps.size} pending op(s)`,
        )
        return
      }
    } else {
      await Promise.allSettled(this.pendingOps)
    }
    logger.log(`AsyncManager.allDone for ${size} op(s) in ${Date.now() - started} ms`)
  }

  reset(): void {
    this.pendingOps.clear()
    this.onErrorHooks = []
  }

  private fireOnErrorHooks(err: any): void {
    if (this.onErrorHooks.length) {
      this.onErrorHooks.forEach(hook => hook(err))
    } else {
      this.logger.error('AsyncManager unhandled rejection:', err)
    }
  }
}

/**
 * Singleton which keeps track of async operations - "voided promise-returning functions"
 * that should run in parallel to the main request.
 *
 * It is an alternative to do `void doSomeAnalytics()`, which should run in parallel
 * and not block the request (not slow down nor fail the request on analytics api failure).
 *
 * At the same time, `void doSomeAnalytics()` gets completely detached and untracked,
 * nothing awaits it, its rejection becomes unhandledRejection (and may kill Node.js process).
 *
 * With AsyncManager, you instead register all those "voided" calls like this:
 *
 * AsyncManager.runInBackground(doSomeAnalytics())
 *
 * Then, in a few places you may be interested to ensure that all async operations have been finished.
 * The places can be:
 * - Graceful shutdown of a backend service
 * - Before the end of runScript
 * - At the end of each unit test, to make sure async ops don't leak
 *
 * You ensure no pending async operations like this:
 *
 * await AsyncManager.allDone()
 *
 * which never throws, but instead awaits all operations to be settled.
 *
 * @experimental
 */
export const AsyncManager = new AsyncManagerImpl()

// Shorthand alias
export const runInBackground = AsyncManager.runInBackground.bind(AsyncManager)

export type OnErrorHook = (err: Error) => any
