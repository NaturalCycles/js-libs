import { Readable } from 'node:stream'
import { FieldPath, type Query, type QuerySnapshot } from '@google-cloud/firestore'
import type { DBQuery } from '@naturalcycles/db-lib'
import { localTime } from '@naturalcycles/js-lib/datetime'
import { _ms } from '@naturalcycles/js-lib/datetime/time.util.js'
import { type CommonLogger, createCommonLoggerAtLevel } from '@naturalcycles/js-lib/log'
import { pRetry } from '@naturalcycles/js-lib/promise/pRetry.js'
import type {
  ObjectWithId,
  PositiveInteger,
  StringMap,
  UnixTimestampMillis,
} from '@naturalcycles/js-lib/types'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib/stream'
import type { FirestoreDBStreamOptions } from './firestore.db.js'
import { unescapeDocId } from './firestore.util.js'

const SHARDS = 16
const SHARD_COLUMN = 'shard16'

/**
 * Highly, HIGHLY experimental!
 */
export class FirestoreShardedReadable<T extends ObjectWithId = any>
  extends Readable
  implements ReadableTyped<T>
{
  private readonly table: string
  private readonly originalLimit: number
  private rowsRetrieved = 0
  /**
   * Next shard to be used for querying.
   */
  private nextShard = 1
  private cursorByShard: StringMap = {}
  private queryIsRunningByShard: StringMap<boolean> = {}

  private paused = false
  private done = false
  private doneShards = new Set<PositiveInteger>()
  private lastQueryDoneByShard: StringMap<UnixTimestampMillis> = {}
  private totalWait = 0

  private readonly opt: FirestoreDBStreamOptions & { batchSize: number }
  private logger: CommonLogger

  constructor(
    private readonly q: Query,
    readonly dbQuery: DBQuery<T>,
    opt: FirestoreDBStreamOptions,
  ) {
    super({ objectMode: true })

    this.opt = {
      batchSize: 3000,
      ...opt,
    }

    this.originalLimit = dbQuery._limitValue
    this.table = dbQuery.table
    const logger = createCommonLoggerAtLevel(opt.logger, opt.logLevel)
    this.logger = logger

    logger.log(
      `!! using experimentalShardedStream !! ${this.table}, batchSize: ${this.opt.batchSize}`,
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
      this.logger.log(`!!! _read was called, but done==true`)
      return
    }

    // const shard = this.getNextShardAndMove()
    const shard = this.findNextFreeShard()
    if (!shard) {
      this.logger.debug(`_read ${this.count}: all shards are busy, skipping`)
      return
    }
    void this.runNextQuery(shard).catch(err => {
      this.logger.error('error in runNextQuery', err)
      this.destroy(err)
    })
  }

  private async runNextQuery(shard: PositiveInteger): Promise<void> {
    if (this.done) return
    const { logger, table } = this

    if (this.lastQueryDoneByShard[shard]) {
      this.totalWait += Date.now() - this.lastQueryDoneByShard[shard]
    }

    this.queryIsRunningByShard[shard] = true

    const limit = this.opt.batchSize

    // We have to orderBy documentId, to be able to use id as a cursor

    let q = this.q.where(SHARD_COLUMN, '==', shard).orderBy(FieldPath.documentId()).limit(limit)
    if (this.cursorByShard[shard]) {
      q = q.startAfter(this.cursorByShard[shard])
    }

    logger.debug(`runNextQuery[${shard}]`, {
      retrieved: this.rowsRetrieved,
    })
    const qs = await this.runQuery(q)
    if (!qs) {
      // this means we have already emitted an unrecoverable error
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
    logger.debug(
      `${table} got ${rows.length} rows, ${this.rowsRetrieved} rowsRetrieved, totalWait: ${_ms(
        this.totalWait,
      )}`,
    )

    this.cursorByShard[shard] = lastDocId
    this.queryIsRunningByShard[shard] = false // ready to take more _reads
    this.lastQueryDoneByShard[shard] = localTime.nowUnixMillis()

    for (const row of rows) {
      this.push(row)
    }

    if (qs.empty) {
      logger.log(
        `!!!! Shard ${shard} DONE! ${this.rowsRetrieved} rowsRetrieved, totalWait: ${_ms(this.totalWait)}`,
      )
      this.doneShards.add(shard)
    }

    if (this.doneShards.size === SHARDS) {
      logger.log(
        `!!!! DONE: all shards completed, ${this.rowsRetrieved} rowsRetrieved, totalWait: ${_ms(this.totalWait)}`,
      )
      this.push(null)
      this.paused = false
      this.done = true
      return
    }

    if (this.originalLimit && this.rowsRetrieved >= this.originalLimit) {
      logger.log(
        `!!!! DONE: reached total limit of ${this.originalLimit}, ${this.rowsRetrieved} rowsRetrieved, totalWait: ${_ms(this.totalWait)}`,
      )
      this.push(null)
      this.paused = false
      this.done = true
      return
    }

    // if (this.paused) {
    //   this.paused = false
    // }
    const nextShard = this.findNextFreeShard()
    if (nextShard) {
      void this.runNextQuery(nextShard)
    } else {
      logger.log(`${table} all shards are busy in runNextQuery, skipping`)
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
      logger.error(
        `FirestoreStreamReadable error!\n`,
        {
          table,
          rowsRetrieved: this.rowsRetrieved,
        },
        err,
      )
      this.destroy(err as Error)
    }
  }

  private findNextFreeShard(): PositiveInteger | undefined {
    for (let shard = 1; shard <= SHARDS; shard++) {
      if (!this.queryIsRunningByShard[shard] && !this.doneShards.has(shard)) {
        return shard
      }
    }
  }

  private _getNextShardAndMove(): PositiveInteger {
    const shard = this.nextShard
    this.nextShard = shard === SHARDS ? 1 : shard + 1
    return shard
  }
}
