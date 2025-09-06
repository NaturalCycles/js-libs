import { Readable } from 'node:stream'
import { FieldPath, type Query, type QuerySnapshot } from '@google-cloud/firestore'
import type { DBQuery } from '@naturalcycles/db-lib'
import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { _since } from '@naturalcycles/js-lib/datetime/time.util.js'
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
  private queryIsRunning = false
  private paused = false
  private done = false
  /**
   * Counts how many times _read was called.
   * For debugging.
   */
  countReads = 0

  private readonly opt: FirestoreDBStreamOptions & { batchSize: number; highWaterMark: number }

  constructor(
    private q: Query,
    dbQuery: DBQuery<T>,
    opt: FirestoreDBStreamOptions,
    private logger: CommonLogger,
  ) {
    // 10_000 was optimal in benchmarks
    const { batchSize = 10_000 } = opt
    const { highWaterMark = batchSize * 3 } = opt
    // Defaulting highWaterMark to 3x batchSize
    super({ objectMode: true, highWaterMark })

    this.opt = {
      ...opt,
      batchSize,
      highWaterMark,
    }
    // todo: support PITR!

    this.originalLimit = dbQuery._limitValue
    this.table = dbQuery.table

    logger.warn(`!!! using experimentalCursorStream`, {
      table: this.table,
      batchSize,
      highWaterMark,
    })
  }

  override _read(): void {
    // this.lastReadTimestamp = Date.now() as UnixTimestampMillis

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
      this.logger.log(`_read #${this.countReads}, queryIsRunning: true, doing nothing`)
      // todo: check if this can cause a "hang", if no more _reads would come later and we get stuck?
      return
    }

    void this.runNextQuery().catch(err => {
      console.log('error in runNextQuery', err)
      this.emit('error', err)
    })
  }

  private async runNextQuery(): Promise<void> {
    if (this.done) return
    const { logger, table } = this

    this.queryIsRunning = true

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

    // logger.log(`runNextQuery`, {
    //   rowsRetrieved: this.rowsRetrieved,
    //   paused: this.paused,
    // })

    const started = localTime.nowUnixMillis()
    const qs = await this.runQuery(q)
    logger.log(`${table} query took ${_since(started)}`)
    if (!qs) {
      // error already emitted in runQuery
      return
    }

    const rows: T[] = []
    let lastDocId: string | undefined

    for (const doc of qs.docs) {
      lastDocId = doc.id
      rows.push({
        id: unescapeDocId(doc.id),
        ...doc.data(),
      } as T)
    }

    this.rowsRetrieved += rows.length
    logger.log(`${table} got ${rows.length} rows, ${this.rowsRetrieved} rowsRetrieved`)

    this.endCursor = lastDocId
    this.queryIsRunning = false // ready to take more _reads
    let shouldContinue = false

    for (const row of rows) {
      shouldContinue = this.push(row)
    }

    if (!rows.length || (this.originalLimit && this.rowsRetrieved >= this.originalLimit)) {
      logger.warn(`${table} DONE! ${this.rowsRetrieved} rowsRetrieved`)
      this.push(null)
      this.done = true
      this.paused = false
      return
    }

    if (shouldContinue) {
      // Keep the stream flowing
      logger.log(`${table} continuing the stream`)
      void this.runNextQuery()
    } else {
      // Not starting the next query
      if (this.paused) {
        logger.log(`${table} stream is already paused`)
      } else {
        logger.warn(`${table} pausing the stream`)
        this.paused = true
      }
    }
  }

  private async runQuery(q: Query): Promise<QuerySnapshot | undefined> {
    const { table, logger } = this

    try {
      return await pRetry(
        async () => {
          return await q.get()
        },
        {
          name: `FirestoreStreamReadable.query(${table})`,
          maxAttempts: 5,
          delay: 5000,
          delayMultiplier: 2,
          logger,
          timeout: 120_000, // 2 minutes
        },
      )
    } catch (err) {
      console.log(
        `FirestoreStreamReadable error!\n`,
        {
          table,
          rowsRetrieved: this.rowsRetrieved,
        },
        err,
      )
      this.emit('error', err)
      return
    }
  }
}
