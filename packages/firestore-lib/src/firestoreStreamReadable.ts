import { Readable } from 'node:stream'
import { FieldPath, type Query, type QuerySnapshot } from '@google-cloud/firestore'
import type { DBQuery } from '@naturalcycles/db-lib'
import { _ms } from '@naturalcycles/js-lib/datetime/time.util.js'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { pRetry } from '@naturalcycles/js-lib/promise/pRetry.js'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib/stream'
import type { FirestoreDBStreamOptions } from './firestore.db.js'
import { unescapeDocId } from './firestore.util.js'

export class FirestoreStreamReadable<T extends ObjectWithId = any>
  extends Readable
  implements ReadableTyped<T>
{
  private readonly table: string
  private readonly originalLimit: number
  private rowsRetrieved = 0
  private endCursor?: string
  private running = false
  private done = false
  private lastQueryDone?: number
  private totalWait = 0

  private readonly opt: FirestoreDBStreamOptions & { batchSize: number; rssLimitMB: number }
  // private readonly dsOpt: RunQueryOptions

  constructor(
    private q: Query,
    dbQuery: DBQuery<T>,
    opt: FirestoreDBStreamOptions,
    private logger: CommonLogger,
  ) {
    super({ objectMode: true })

    this.opt = {
      rssLimitMB: 1000,
      batchSize: 1000,
      ...opt,
    }
    // todo: support PITR!
    // this.dsOpt = {}
    // if (opt.readAt) {
    //   // Datastore expects UnixTimestamp in milliseconds
    //   this.dsOpt.readTime = opt.readAt * 1000
    // }

    this.originalLimit = dbQuery._limitValue
    this.table = dbQuery.table

    logger.log(
      `!! using experimentalCursorStream !! ${this.table}, batchSize: ${this.opt.batchSize}`,
    )
  }

  /**
   * Counts how many times _read was called.
   * For debugging.
   */
  count = 0

  override _read(): void {
    // this.lastReadTimestamp = Date.now() as UnixTimestampMillis

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

  private async runNextQuery(): Promise<void> {
    if (this.done) return

    if (this.lastQueryDone) {
      const now = Date.now()
      this.totalWait += now - this.lastQueryDone
    }

    this.running = true

    let limit = this.opt.batchSize

    if (this.originalLimit) {
      limit = Math.min(this.opt.batchSize, this.originalLimit - this.rowsRetrieved)
    }

    // console.log(`limit: ${limit}`)
    // We have to orderBy documentId, to be able to use id as a cursor
    let q = this.q.orderBy(FieldPath.documentId()).limit(limit)
    if (this.endCursor) {
      q = q.startAfter(this.endCursor)
    }

    let qs: QuerySnapshot

    try {
      await pRetry(
        async () => {
          qs = await q.get()
        },
        {
          name: `FirestoreStreamReadable.query(${this.table})`,
          maxAttempts: 5,
          delay: 5000,
          delayMultiplier: 2,
          logger: this.logger,
          timeout: 120_000, // 2 minutes
        },
      )
    } catch (err) {
      console.log(
        `FirestoreStreamReadable error!\n`,
        {
          table: this.table,
          rowsRetrieved: this.rowsRetrieved,
        },
        err,
      )
      this.emit('error', err)
      // clearInterval(this.maxWaitInterval)
      return
    }

    const rows: T[] = []
    let lastDocId: string | undefined

    for (const doc of qs!.docs) {
      lastDocId = doc.id
      rows.push({
        id: unescapeDocId(doc.id),
        ...doc.data(),
      } as T)
    }

    this.rowsRetrieved += rows.length
    this.logger.log(
      `${this.table} got ${rows.length} rows, ${this.rowsRetrieved} rowsRetrieved, totalWait: ${_ms(
        this.totalWait,
      )}`,
    )

    this.endCursor = lastDocId
    this.running = false // ready to take more _reads
    this.lastQueryDone = Date.now()

    for (const row of rows) {
      this.push(row)
    }

    if (qs!.empty || (this.originalLimit && this.rowsRetrieved >= this.originalLimit)) {
      this.logger.log(
        `!!!! DONE! ${this.rowsRetrieved} rowsRetrieved, totalWait: ${_ms(this.totalWait)}`,
      )
      this.push(null)
      this.done = true
    } else if (this.opt.singleBatchBuffer) {
      // here we don't start next query until we're asked (via next _read call)
      // so, let's do nothing
    } else {
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
}
