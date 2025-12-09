import { Readable } from 'node:stream'
import type { Query } from '@google-cloud/datastore'
import type {
  RunQueryInfo,
  RunQueryOptions,
  RunQueryResponse,
} from '@google-cloud/datastore/build/src/query.js'
import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { _ms } from '@naturalcycles/js-lib/datetime/time.util.js'
import { type CommonLogger, createCommonLoggerAtLevel } from '@naturalcycles/js-lib/log'
import { pRetry } from '@naturalcycles/js-lib/promise/pRetry.js'
import type { UnixTimestampMillis } from '@naturalcycles/js-lib/types'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib/stream'
import type { DatastoreDBStreamOptions } from './datastore.model.js'

export class DatastoreStreamReadable<T = any> extends Readable implements ReadableTyped<T> {
  private readonly table: string
  private readonly originalLimit: number
  private rowsRetrieved = 0
  /**
   * Counts how many times _read was called.
   * For debugging.
   */
  countReads = 0
  private endCursor?: string
  private queryIsRunning = false
  private paused = false
  private done = false
  private lastQueryDone?: number
  private totalWait = 0
  /**
   * Used to support maxWait
   */
  private lastReadTimestamp = 0 as UnixTimestampMillis
  private readonly maxWaitInterval: NodeJS.Timeout | undefined

  private readonly opt: DatastoreDBStreamOptions & { batchSize: number; highWaterMark: number }
  private readonly logger: CommonLogger
  private readonly dsOpt: RunQueryOptions

  constructor(
    private q: Query,
    opt: DatastoreDBStreamOptions,
  ) {
    // 1_000 was optimal in benchmarks
    const { batchSize = 1000 } = opt
    const { highWaterMark = batchSize * 3 } = opt
    // Defaulting highWaterMark to 3x batchSize
    super({ objectMode: true, highWaterMark })

    this.opt = {
      ...opt,
      batchSize,
      highWaterMark,
    }
    this.dsOpt = {}
    if (opt.readAt) {
      // Datastore expects UnixTimestamp in milliseconds
      this.dsOpt.readTime = opt.readAt * 1000
    }

    const logger = createCommonLoggerAtLevel(opt.logger, opt.logLevel)
    this.logger = logger
    this.originalLimit = q.limitVal
    this.table = q.kinds[0]!

    logger.log(`!! using experimentalCursorStream`, {
      table: this.table,
      batchSize,
      highWaterMark,
    })

    const { maxWait } = this.opt
    if (maxWait) {
      logger.log(`!! ${this.table} maxWait ${maxWait}`)

      this.maxWaitInterval = setInterval(
        () => {
          const millisSinceLastRead = Date.now() - this.lastReadTimestamp

          if (millisSinceLastRead < maxWait * 1000) {
            logger.log(
              `!! ${this.table} millisSinceLastRead(${millisSinceLastRead}) < maxWait*1000`,
            )
            return
          }

          const { queryIsRunning, rowsRetrieved } = this
          logger.log(`maxWait of ${maxWait} seconds reached, force-triggering _read`, {
            running: queryIsRunning,
            rowsRetrieved,
          })

          // force-trigger _read
          // regardless of `running` status
          this._read()
        },
        (maxWait * 1000) / 2,
      )
    }
  }

  override _read(): void {
    this.lastReadTimestamp = localTime.nowUnixMillis()

    // console.log(`_read called ${++this.count}, wasRunning: ${this.running}`) // debugging
    this.countReads++

    if (this.done) {
      this.logger.warn(`!!! _read was called, but done==true`)
      return
    }

    if (this.paused) {
      this.logger.log(
        `_read #${this.countReads}, queryIsRunning: ${this.queryIsRunning}, unpausing stream`,
      )
      this.paused = false
    }

    if (this.queryIsRunning) {
      this.logger.debug(`_read #${this.countReads}, queryIsRunning: true, doing nothing`)
      return
    }

    void this.runNextQuery().catch(err => {
      this.logger.error('error in runNextQuery', err)
      this.destroy(err)
    })
  }

  private async runNextQuery(): Promise<void> {
    if (this.done) return
    const { logger, table } = this

    if (this.lastQueryDone) {
      const now = Date.now()
      this.totalWait += now - this.lastQueryDone
    }

    this.queryIsRunning = true

    let limit = this.opt.batchSize

    if (this.originalLimit) {
      limit = Math.min(this.opt.batchSize, this.originalLimit - this.rowsRetrieved)
    }

    let q = this.q.limit(limit)
    if (this.endCursor) {
      q = q.start(this.endCursor)
    }

    const started = localTime.nowUnixMillis()
    const res = await this.runQuery(q)
    const queryTook = Date.now() - started
    if (!res) {
      // error already emitted in runQuery
      return
    }
    const rows: T[] = res[0]
    const info: RunQueryInfo = res[1]

    this.rowsRetrieved += rows.length
    logger.log(
      `${table} got ${rows.length} rows in ${_ms(queryTook)}, ${this.rowsRetrieved} rowsRetrieved, totalWait: ${_ms(
        this.totalWait,
      )}`,
    )

    this.endCursor = info.endCursor
    this.queryIsRunning = false // ready to take more _reads
    this.lastQueryDone = Date.now()
    let shouldContinue = false

    for (const row of rows) {
      shouldContinue = this.push(row)
    }

    if (
      !info.endCursor ||
      info.moreResults === 'NO_MORE_RESULTS' ||
      (this.originalLimit && this.rowsRetrieved >= this.originalLimit)
    ) {
      logger.log(
        `!!!! DONE! ${this.rowsRetrieved} rowsRetrieved, totalWait: ${_ms(this.totalWait)}`,
      )
      this.push(null)
      this.done = true
      this.paused = false
      clearInterval(this.maxWaitInterval)
      return
    }

    if (shouldContinue) {
      // Keep the stream flowing
      logger.debug(`${table} continuing the stream`)
      void this.runNextQuery()
    } else {
      // Not starting the next query
      if (this.paused) {
        logger.debug(`${table} stream is already paused`)
      } else {
        logger.log(`${table} pausing the stream`)
        this.paused = true
      }
    }
  }

  private async runQuery(q: Query): Promise<RunQueryResponse | undefined> {
    const { table, logger } = this

    try {
      return await pRetry(
        async () => {
          return await q.run(this.dsOpt)
        },
        {
          name: `DatastoreStreamReadable.query(${table})`,
          predicate: err => RETRY_ON.some(s => err?.message?.toLowerCase()?.includes(s)),
          maxAttempts: 5,
          delay: 5000,
          delayMultiplier: 2,
          logger,
          timeout: 120_000, // 2 minutes
        },
      )
    } catch (err) {
      logger.error(
        `DatastoreStreamReadable error!\n`,
        {
          table,
          rowsRetrieved: this.rowsRetrieved,
        },
        err,
      )
      clearInterval(this.maxWaitInterval)
      this.destroy(err as Error)
    }
  }
}

// Examples of errors:
// UNKNOWN: Stream removed
const RETRY_ON = [
  'GOAWAY',
  'UNAVAILABLE',
  'UNKNOWN',
  'DEADLINE_EXCEEDED',
  'ABORTED',
  'much contention',
  'try again',
  'timeout',
].map(s => s.toLowerCase())
