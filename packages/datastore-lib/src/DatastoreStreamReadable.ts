import { Readable } from 'node:stream'
import type { Query } from '@google-cloud/datastore'
import type { RunQueryInfo, RunQueryOptions } from '@google-cloud/datastore/build/src/query.js'
import type { CommonLogger, UnixTimestampMillis } from '@naturalcycles/js-lib'
import { _ms, pRetry } from '@naturalcycles/js-lib'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib'
import type { DatastoreDBStreamOptions } from './datastore.model.js'

export class DatastoreStreamReadable<T = any> extends Readable implements ReadableTyped<T> {
  private readonly originalLimit: number
  private rowsRetrieved = 0
  private endCursor?: string
  private running = false
  private done = false
  private lastQueryDone?: number
  private totalWait = 0
  private readonly table: string
  /**
   * Used to support maxWait
   */
  private lastReadTimestamp = 0 as UnixTimestampMillis
  private readonly maxWaitInterval: NodeJS.Timeout | undefined

  private readonly opt: DatastoreDBStreamOptions & { batchSize: number }
  private readonly dsOpt: RunQueryOptions

  constructor(
    private q: Query,
    opt: DatastoreDBStreamOptions,
    private logger: CommonLogger,
  ) {
    super({ objectMode: true })

    this.opt = {
      rssLimitMB: 1000,
      batchSize: 1000,
      ...opt,
    }
    this.dsOpt = {}
    if (opt.readAt) {
      // Datastore expects UnixTimestamp in milliseconds
      this.dsOpt.readTime = opt.readAt * 1000
    }

    this.originalLimit = q.limitVal
    this.table = q.kinds[0]!

    logger.log(`!! using experimentalCursorStream !! ${this.table}, batchSize: ${opt.batchSize}`)

    const { maxWait } = this.opt
    if (maxWait) {
      this.logger.warn(`!! ${this.table} maxWait ${maxWait}`)

      this.maxWaitInterval = setInterval(
        () => {
          const millisSinceLastRead = Date.now() - this.lastReadTimestamp

          if (millisSinceLastRead < maxWait * 1000) {
            this.logger.warn(
              `!! ${this.table} millisSinceLastRead(${millisSinceLastRead}) < maxWait*1000`,
            )
            return
          }

          const { running, rowsRetrieved } = this
          this.logger.warn(`maxWait of ${maxWait} seconds reached, force-triggering _read`, {
            running,
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

  private async runNextQuery(): Promise<void> {
    if (this.done) return

    if (this.lastQueryDone) {
      const now = Date.now()
      this.totalWait += now - this.lastQueryDone
    }

    this.running = true
    // console.log('running query...')

    let limit = this.opt.batchSize

    if (this.originalLimit) {
      limit = Math.min(this.opt.batchSize, this.originalLimit - this.rowsRetrieved)
    }

    // console.log(`limit: ${limit}`)
    let q = this.q.limit(limit)
    if (this.endCursor) {
      q = q.start(this.endCursor)
    }

    let rows: T[] = []
    let info: RunQueryInfo = {}

    try {
      await pRetry(
        async () => {
          const res = await q.run(this.dsOpt)
          rows = res[0]
          info = res[1]
        },
        {
          name: `DatastoreStreamReadable.query(${this.table})`,
          maxAttempts: 5,
          delay: 5000,
          delayMultiplier: 2,
          logger: this.logger,
          timeout: 120_000, // 2 minutes
        },
      )
    } catch (err) {
      console.log(
        `DatastoreStreamReadable error!\n`,
        {
          table: this.table,
          rowsRetrieved: this.rowsRetrieved,
        },
        err,
      )
      this.emit('error', err)
      clearInterval(this.maxWaitInterval)
      return
    }

    this.rowsRetrieved += rows.length
    this.logger.log(
      `${this.table} got ${rows.length} rows, ${this.rowsRetrieved} rowsRetrieved, totalWait: ${_ms(
        this.totalWait,
      )}`,
      info.moreResults,
    )

    if (!rows.length) {
      this.logger.warn(
        `${this.table} got 0 rows, totalWait: ${_ms(this.totalWait)}`,
        info.moreResults,
      )
    }

    this.endCursor = info.endCursor
    this.running = false // ready to take more _reads
    this.lastQueryDone = Date.now()

    rows.forEach(row => this.push(row))

    if (
      !info.endCursor ||
      info.moreResults === 'NO_MORE_RESULTS' ||
      (this.originalLimit && this.rowsRetrieved >= this.originalLimit)
    ) {
      this.logger.log(
        `!!!! DONE! ${this.rowsRetrieved} rowsRetrieved, totalWait: ${_ms(this.totalWait)}`,
      )
      this.push(null)
      this.done = true
      clearInterval(this.maxWaitInterval)
    } else if (this.opt.singleBatchBuffer) {
      // here we don't start next query until we're asked (via next _read call)
      // do, let's do nothing
    } else if (this.opt.rssLimitMB) {
      const rssMB = Math.round(process.memoryUsage().rss / 1024 / 1024)

      if (rssMB <= this.opt.rssLimitMB) {
        void this.runNextQuery()
      } else {
        this.logger.warn(
          `${this.table} rssLimitMB reached ${rssMB} > ${this.opt.rssLimitMB}, pausing stream`,
        )
      }
    }
  }

  /**
   * Counts how many times _read was called.
   * For debugging.
   */
  count = 0

  override _read(): void {
    this.lastReadTimestamp = Date.now() as UnixTimestampMillis

    // console.log(`_read called ${++this.count}, wasRunning: ${this.running}`) // debugging
    this.count++

    if (this.done) {
      this.logger.warn(`!!! _read was called, but done==true`)
      return
    }

    if (!this.running) {
      void this.runNextQuery().catch(err => {
        console.log('error in runNextQuery', err)
        this.emit('error', err)
      })
    } else {
      this.logger.log(`_read ${this.count}, wasRunning: true`)
    }
  }
}
