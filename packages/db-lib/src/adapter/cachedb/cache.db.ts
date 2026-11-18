import { _isEmptyObject, _isTruthy } from '@naturalcycles/js-lib'
import { _mapBy, _sum } from '@naturalcycles/js-lib/array'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { consoleLogger } from '@naturalcycles/js-lib/log'
import { _filterObject, _mapValues } from '@naturalcycles/js-lib/object'
import type { ObjectWithId, StringMap } from '@naturalcycles/js-lib/types'
import { _stringMapEntries } from '@naturalcycles/js-lib/types'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import type { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import { BaseCommonDB } from '../../commondb/base.common.db.js'
import type { CommonDB } from '../../commondb/common.db.js'
import type {
  CommonDBOptions,
  CommonDBReadOptions,
  CommonDBSaveOptions,
  CommonDBTransactionOptions,
  DBTransaction,
  DBTransactionFn,
  RunQueryResult,
} from '../../db.model.js'
import { DBQuery } from '../../query/dbQuery.js'
import type {
  CacheDBCfg,
  CacheDBCreateOptions,
  CacheDBOptions,
  CacheDBReadOptions,
  CacheDBSaveOptions,
  CacheDBStreamOptions,
} from './cache.db.model.js'
import { NoopDB } from './noop.db.js'

/**
 * CommonDB implementation that proxies requests to downstream CommonDB
 * and caches rows in `cacheDB` (NoopDB by default).
 *
 * Queries always hit downstream (unless `onlyCache` is passed)
 */
export class CacheDB extends BaseCommonDB implements CommonDB {
  constructor(cfg: CacheDBCfg) {
    super()
    _assert(!cfg.onlyCache || !cfg.skipCache, 'CacheDB: onlyCache and skipCache are both set')
    this.cfg = {
      ...cfg,
      cacheDB: cfg.cacheDB || new NoopDB(),
      logger: cfg.logger || consoleLogger,
    }
    this.dbType = cfg.downstreamDB.dbType
    this.support = { ...cfg.downstreamDB.support }
  }

  cfg: CacheDBCfg & { cacheDB: CommonDB; logger: CommonLogger }

  //#region Overridden CommonDB methods

  override async ping(): Promise<void> {
    await Promise.all([this.cfg.cacheDB.ping(), this.cfg.downstreamDB.ping()])
  }

  override async getTables(): Promise<string[]> {
    return await this.cfg.downstreamDB.getTables()
  }

  override async getTableSchema<ROW extends ObjectWithId>(table: string): Promise<JsonSchema<ROW>> {
    return await this.cfg.downstreamDB.getTableSchema<ROW>(table)
  }

  override async createTable<ROW extends ObjectWithId>(
    table: string,
    schema: JsonSchema<ROW>,
    opt: CacheDBCreateOptions = {},
  ): Promise<void> {
    if (this.useDownstream(opt)) {
      await this.cfg.downstreamDB.createTable(table, schema, this.downstreamOpt(opt))
    }

    if (this.useCache(opt)) {
      await this.cfg.cacheDB.createTable(table, schema, { dropIfExists: opt.dropIfExists })
    }
  }

  override async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: readonly string[],
    opt: CacheDBReadOptions = {},
  ): Promise<ROW[]> {
    if (this.isInTransaction(opt)) {
      return await opt.tx.getByIds<ROW>(table, ids, opt)
    }

    const shouldReadCache = this.isCacheReadable(opt)
    const rowById = new Map<string, ROW>()
    let missingIds = ids

    if (shouldReadCache) {
      const rows = await this.cfg.cacheDB.getByIds<ROW>(table, ids)
      for (const r of rows) rowById.set(r.id, r)
      missingIds = ids.filter(id => !rowById.has(id))
      this.getCacheLogger()?.log(formatRows(`${table}.getByIds`, rows, 'from cache'))
    }

    if (this.useDownstream(opt) && missingIds.length) {
      const downstreamOpt = this.downstreamOpt(opt)
      const rows = await this.cfg.downstreamDB.getByIds<ROW>(table, missingIds, downstreamOpt)
      for (const r of rows) rowById.set(r.id, r)
      this.getDownstreamLogger()?.log(formatRows(`${table}.getByIds`, rows, 'from downstream'))

      if (shouldReadCache && rows.length) {
        await this.writeCache(this.cfg.cacheDB.saveBatch(table, rows))
      }
    }

    // return in right order
    return ids.map(id => rowById.get(id)).filter(_isTruthy)
  }

  override async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rows: readonly ROW[],
    opt: CacheDBSaveOptions<ROW> = {},
  ): Promise<void> {
    if (this.isInTransaction(opt)) {
      return await opt.tx.saveBatch(table, rows, opt)
    }

    if (this.useDownstream(opt)) {
      await this.cfg.downstreamDB.saveBatch(table, rows, this.downstreamOpt(opt))
      this.getDownstreamLogger()?.log(formatRows(`${table}.saveBatch`, rows, 'to downstream'))
    }

    await this.saveToCache(table, rows, opt)
  }

  override async patchById<ROW extends ObjectWithId>(
    table: string,
    id: string,
    patch: Partial<ROW>,
    opt: CacheDBOptions = {},
  ): Promise<void> {
    if (this.isOnlyCache(opt)) {
      return await this.cfg.cacheDB.patchById(table, id, patch)
    }

    await this.cfg.downstreamDB.patchById(table, id, patch, this.downstreamOpt(opt))

    // We only have the patch, not the full row, so we remove the row from the cache
    await this.invalidateCache(table, [id], opt)
  }

  override async incrementBatch(
    table: string,
    prop: string,
    incrementMap: StringMap<number>,
    opt: CacheDBOptions = {},
  ): Promise<StringMap<number>> {
    if (this.isOnlyCache(opt)) {
      return await this.cfg.cacheDB.incrementBatch(table, prop, incrementMap)
    }

    const result = await this.cfg.downstreamDB.incrementBatch(
      table,
      prop,
      incrementMap,
      this.downstreamOpt(opt),
    )

    // We only have the new values of `prop`, not the full rows, so we remove the rows from the cache
    await this.invalidateCache(table, Object.keys(incrementMap), opt)

    return result
  }

  override async deleteByIds(
    table: string,
    ids: readonly string[],
    opt: CacheDBOptions = {},
  ): Promise<number> {
    if (this.isInTransaction(opt)) {
      return await opt.tx.deleteByIds(table, ids, opt)
    }

    if (this.isOnlyCache(opt)) {
      return await this.cfg.cacheDB.deleteByIds(table, ids)
    }

    const deleted = await this.cfg.downstreamDB.deleteByIds(table, ids, this.downstreamOpt(opt))
    this.getDownstreamLogger()?.log(`${table}.deleteByIds ${deleted} rows from downstream`)

    await this.invalidateCache(table, ids, opt)

    return deleted
  }

  override async multiGet<ROW extends ObjectWithId>(
    idsByTable: StringMap<string[]>,
    opt: CacheDBReadOptions = {},
  ): Promise<StringMap<ROW[]>> {
    const rowByIdByTable: StringMap<Map<string, ROW>> = {}
    let missingIdsByTable = { ...idsByTable }

    const shouldReadCache = this.isCacheReadable(opt)
    if (shouldReadCache) {
      const cachedRowsByTable = await this.multiGetCache<ROW>(idsByTable)
      missingIdsByTable = {}
      for (const [table, ids] of _stringMapEntries(idsByTable)) {
        const rows = cachedRowsByTable[table] || []
        const rowById = _mapBy(rows, r => r.id)
        rowByIdByTable[table] = rowById
        const missingIds = ids.filter(id => !rowById.has(id))
        if (missingIds.length) {
          missingIdsByTable[table] = missingIds
        }
        this.getCacheLogger()?.log(formatRows(`${table}.multiGet`, rows, 'from cache'))
      }
    }

    if (this.useDownstream(opt) && !_isEmptyObject(missingIdsByTable)) {
      const downstreamOpt = this.downstreamOpt(opt)
      const rowsByTable = await this.cfg.downstreamDB.multiGet<ROW>(
        missingIdsByTable,
        downstreamOpt,
      )
      const foundRowsByTable = _filterObject(rowsByTable, (_, rows) => rows.length > 0)

      for (const [table, rows] of _stringMapEntries(foundRowsByTable)) {
        const rowById = (rowByIdByTable[table] ||= new Map())
        for (const r of rows) rowById.set(r.id, r)
        this.getDownstreamLogger()?.log(formatRows(`${table}.multiGet`, rows, 'from downstream'))
      }

      if (shouldReadCache && !_isEmptyObject(foundRowsByTable)) {
        await this.writeCache(this.multiSaveCache(foundRowsByTable))
      }
    }

    const result: StringMap<ROW[]> = {}
    for (const [table, ids] of _stringMapEntries(idsByTable)) {
      const rowById = rowByIdByTable[table]
      result[table] = rowById ? ids.map(id => rowById.get(id)).filter(_isTruthy) : []
    }
    return result
  }

  override async multiSave<ROW extends ObjectWithId>(
    rowsByTable: StringMap<ROW[]>,
    opt: CacheDBSaveOptions<ROW> = {},
  ): Promise<void> {
    const entries = _stringMapEntries(rowsByTable)

    if (this.useDownstream(opt)) {
      await this.cfg.downstreamDB.multiSave(rowsByTable, this.downstreamOpt(opt))
      const logger = this.getDownstreamLogger()
      for (const [table, rows] of entries) {
        logger?.log(formatRows(`${table}.multiSave`, rows, 'to downstream'))
      }
    }

    await this.multiSaveToCache(rowsByTable, opt)
  }

  override async multiDelete(
    idsByTable: StringMap<string[]>,
    opt: CacheDBOptions = {},
  ): Promise<number> {
    if (this.isOnlyCache(opt)) {
      return await this.multiDeleteCache(idsByTable)
    }

    const deleted = await this.cfg.downstreamDB.multiDelete(idsByTable, this.downstreamOpt(opt))
    this.getDownstreamLogger()?.log(`multiDelete ${deleted} rows from downstream`)

    await this.multiInvalidateCache(idsByTable, opt)
    return deleted
  }

  override async runQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt: CacheDBReadOptions = {},
  ): Promise<RunQueryResult<ROW>> {
    if (this.isOnlyCache(opt)) {
      const result = await this.cfg.cacheDB.runQuery(q)
      this.getCacheLogger()?.log(`${q.table}.runQuery ${result.rows.length} rows from cache`)
      return result
    }

    const result = await this.cfg.downstreamDB.runQuery(q, this.downstreamOpt(opt))
    this.getDownstreamLogger()?.log(
      `${q.table}.runQuery ${result.rows.length} rows from downstream`,
    )

    // Don't save to cache if it was a projection query
    if (this.isCacheReadable(opt) && !q._selectedFieldNames && result.rows.length) {
      await this.writeCache(this.cfg.cacheDB.saveBatch(q.table, result.rows))
    }
    return result
  }

  override async runQueryCount<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt: CacheDBReadOptions = {},
  ): Promise<number> {
    if (this.isOnlyCache(opt)) {
      const count = await this.cfg.cacheDB.runQueryCount(q)
      this.getCacheLogger()?.log(`${q.table}.runQueryCount ${count} rows from cache`)
      return count
    }

    return await this.cfg.downstreamDB.runQueryCount(q, this.downstreamOpt(opt))
  }

  override streamQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt: CacheDBStreamOptions = {},
  ): Pipeline<ROW> {
    if (this.isOnlyCache(opt)) {
      return this.cfg.cacheDB.streamQuery<ROW>(q)
    }

    return this.cfg.downstreamDB.streamQuery<ROW>(q, this.downstreamOpt(opt))
  }

  override async deleteByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt: CacheDBOptions = {},
  ): Promise<number> {
    if (this.isOnlyCache(opt)) {
      const deleted = await this.cfg.cacheDB.deleteByQuery(q)
      this.getCacheLogger()?.log(`${q.table}.deleteByQuery ${deleted} rows from cache`)
      return deleted
    }

    const deleted = await this.cfg.downstreamDB.deleteByQuery(q, this.downstreamOpt(opt))
    this.getDownstreamLogger()?.log(
      `${q.table}.deleteByQuery ${deleted} rows from downstream and cache`,
    )

    await this.invalidateCacheByQuery(q)
    return deleted
  }

  override async patchByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    patch: Partial<ROW>,
    opt: CacheDBOptions = {},
  ): Promise<number> {
    if (this.isOnlyCache(opt)) {
      return await this.cfg.cacheDB.patchByQuery(q, patch)
    }

    const updated = await this.cfg.downstreamDB.patchByQuery(q, patch, this.downstreamOpt(opt))
    // We do not know how the query changed the rows, so remove all matching rows from the cache
    await this.invalidateCacheByQuery(q)
    return updated
  }

  override async runInTransaction(
    fn: DBTransactionFn,
    opt?: CommonDBTransactionOptions,
  ): Promise<void> {
    const txs: CacheDBTransaction[] = []

    try {
      await this.cfg.downstreamDB.runInTransaction(async downstreamTx => {
        const tx = new CacheDBTransaction(this, downstreamTx)
        txs.push(tx)
        await fn(tx)
      }, opt)
    } finally {
      // A read outside the transaction can cache the old rows before commit, so remove them again
      // With transactions that did not commit, the cost is only some extra cache deletes.
      await Promise.all(txs.map(tx => tx.invalidateWrittenIds()))
    }
  }

  override async createTransaction(opt?: CommonDBTransactionOptions): Promise<DBTransaction> {
    const downstreamTx = await this.cfg.downstreamDB.createTransaction(opt)
    return new CacheDBTransaction(this, downstreamTx)
  }

  //#endregion

  private async saveToCache<ROW extends ObjectWithId>(
    table: string,
    rows: readonly ROW[],
    opt: CacheDBSaveOptions<ROW>,
  ): Promise<void> {
    if (this.isSkipCache(opt) || this.isInTransaction(opt)) {
      // We must not cache the new rows here, so we just remove the outdated rows from the cache
      await this.invalidateCache(
        table,
        rows.map(r => r.id),
        opt,
      )
      return
    }

    const { excludeFromIndexes } = opt
    await this.writeCache(
      this.cfg.cacheDB.saveBatch(table, rows, { excludeFromIndexes }).then(() => {
        this.getCacheLogger()?.log(formatRows(`${table}.saveBatch`, rows, 'to cache'))
      }),
    )
  }

  private async multiSaveToCache<ROW extends ObjectWithId>(
    rowsByTable: StringMap<ROW[]>,
    opt: CacheDBSaveOptions<ROW>,
  ): Promise<void> {
    if (this.isSkipCache(opt) || this.isInTransaction(opt)) {
      // We must not cache the new rows here, so we just remove the outdated rows from the cache
      const idsByTable = _mapValues<StringMap<string[]>>(rowsByTable, (_, rows: ROW[]) =>
        rows.map(r => r.id),
      )
      await this.multiInvalidateCache(idsByTable, opt)
      return
    }

    const { excludeFromIndexes } = opt
    await this.writeCache(
      this.multiSaveCache(rowsByTable, { excludeFromIndexes }).then(() => {
        const logger = this.getCacheLogger()
        for (const [table, rows] of _stringMapEntries(rowsByTable)) {
          logger?.log(formatRows(`${table}.multiSave`, rows, 'to cache'))
        }
      }),
    )
  }

  async invalidateCache(
    table: string,
    ids: readonly string[],
    opt: CommonDBOptions = {},
  ): Promise<void> {
    const validIds = ids.filter(_isTruthy)
    if (!validIds.length) {
      return
    }
    if (this.isInTransaction(opt)) {
      opt.tx.addWrittenIds(table, validIds)
    }
    await this.writeCache(this.cfg.cacheDB.deleteByIds(table, validIds))
  }

  async multiInvalidateCache(
    idsByTable: StringMap<readonly string[]>,
    opt: CommonDBOptions = {},
  ): Promise<void> {
    const validIdsByTable: StringMap<string[]> = {}
    for (const [table, ids] of _stringMapEntries(idsByTable)) {
      const validIds = ids.filter(_isTruthy)
      if (validIds.length) {
        validIdsByTable[table] = validIds
      }
    }

    if (_isEmptyObject(validIdsByTable)) return

    if (this.isInTransaction(opt)) {
      for (const [table, ids] of _stringMapEntries(validIdsByTable)) {
        opt.tx.addWrittenIds(table, ids)
      }
    }

    await this.writeCache(this.multiDeleteCache(validIdsByTable))
  }

  private async invalidateCacheByQuery<ROW extends ObjectWithId>(q: DBQuery<ROW>): Promise<void> {
    const cacheQuery = DBQuery.create<ROW>(q.table)
    // Use only the filters: limit and offset would select other rows in the cache than in the DB
    cacheQuery._filters = q._filters
    await this.writeCache(this.cfg.cacheDB.deleteByQuery(cacheQuery))
  }

  private async multiGetCache<ROW extends ObjectWithId>(
    idsByTable: StringMap<string[]>,
  ): Promise<StringMap<ROW[]>> {
    if (this.cfg.cacheDB.support.multiTableOperations) {
      return await this.cfg.cacheDB.multiGet<ROW>(idsByTable)
    }

    const rowsByTable: StringMap<ROW[]> = {}
    await Promise.all(
      _stringMapEntries(idsByTable).map(async ([table, ids]) => {
        rowsByTable[table] = await this.cfg.cacheDB.getByIds<ROW>(table, ids)
      }),
    )
    return rowsByTable
  }

  private async multiSaveCache<ROW extends ObjectWithId>(
    rowsByTable: StringMap<ROW[]>,
    opt?: CommonDBSaveOptions<ROW>,
  ): Promise<void> {
    if (this.cfg.cacheDB.support.multiTableOperations) {
      return await this.cfg.cacheDB.multiSave(rowsByTable, opt)
    }

    const entries = _stringMapEntries(rowsByTable)
    await Promise.all(entries.map(([table, rows]) => this.cfg.cacheDB.saveBatch(table, rows, opt)))
  }

  private async multiDeleteCache(idsByTable: StringMap<string[]>): Promise<number> {
    if (this.cfg.cacheDB.support.multiTableOperations) {
      return await this.cfg.cacheDB.multiDelete(idsByTable)
    }

    const entries = _stringMapEntries(idsByTable)
    const counts = await Promise.all(
      entries.map(([table, ids]) => this.cfg.cacheDB.deleteByIds(table, ids)),
    )
    return _sum(counts)
  }

  private async writeCache(promise: Promise<unknown>): Promise<void> {
    if (this.cfg.awaitCache) {
      await promise
      return
    }

    void promise.catch(err => this.cfg.logger.error('CacheDB: cache write failed', err))
  }

  private downstreamOpt<OPT extends CommonDBOptions>(opt: OPT): OPT {
    if (this.isInTransaction(opt)) {
      return { ...opt, tx: opt.tx.downstreamTx }
    }

    return opt
  }

  private isCacheReadable(opt: CacheDBReadOptions): boolean {
    // Reads in a transaction go to the DB, so that the DB can lock the rows
    return this.useCache(opt) && !this.isInTransaction(opt) && !opt.readAt
  }

  private isInTransaction<OPT extends CommonDBOptions>(
    opt: OPT,
  ): opt is OPT & { tx: CacheDBTransaction } {
    if (!opt.tx) {
      return false
    }

    _assert(
      opt.tx instanceof CacheDBTransaction && opt.tx.db === this,
      'CacheDB: opt.tx is not a transaction of this CacheDB',
    )
    return true
  }

  private useCache(opt: CacheDBOptions): boolean {
    return !this.isSkipCache(opt)
  }

  private useDownstream(opt: CacheDBOptions): boolean {
    return !this.isOnlyCache(opt)
  }

  private isOnlyCache(opt: CacheDBOptions): boolean {
    const onlyCache = !!(opt.onlyCache || this.cfg.onlyCache)
    _assert(!onlyCache || !this.isSkipCache(opt), 'CacheDB: onlyCache and skipCache are both set')
    return onlyCache
  }

  private isSkipCache(opt: CacheDBOptions): boolean {
    return !!(opt.skipCache || this.cfg.skipCache)
  }

  private getCacheLogger(): CommonLogger | undefined {
    if (this.cfg.logCached) {
      return this.cfg.logger
    }
  }

  private getDownstreamLogger(): CommonLogger | undefined {
    if (this.cfg.logDownstream) {
      return this.cfg.logger
    }
  }
}

/**
 * Reads and writes go to the downstream transaction, so that the DB can lock the rows.
 * Written rows are dropped from the cache:
 * uncommitted data must not be served outside the transaction.
 */
export class CacheDBTransaction implements DBTransaction {
  constructor(
    public db: CacheDB,
    public downstreamTx: DBTransaction,
  ) {}

  writtenIdsByTable: StringMap<Set<string>> = {}

  async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: readonly string[],
    opt?: CommonDBReadOptions,
  ): Promise<ROW[]> {
    return await this.downstreamTx.getByIds<ROW>(table, ids, { ...opt, tx: this.downstreamTx })
  }

  async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rows: readonly ROW[],
    opt?: CommonDBSaveOptions<ROW>,
  ): Promise<void> {
    await this.downstreamTx.saveBatch(table, rows, { ...opt, tx: this.downstreamTx })
    await this.db.invalidateCache(
      table,
      rows.map(r => r.id),
      { tx: this },
    )
  }

  async deleteByIds(table: string, ids: readonly string[], opt?: CommonDBOptions): Promise<number> {
    const deleted = await this.downstreamTx.deleteByIds(table, ids, {
      ...opt,
      tx: this.downstreamTx,
    })
    await this.db.invalidateCache(table, ids, { tx: this })
    return deleted
  }

  async commit(): Promise<void> {
    try {
      await this.downstreamTx.commit()
    } finally {
      // A read outside the transaction can cache the old rows before commit, so remove them again
      await this.invalidateWrittenIds()
    }
  }

  async rollback(): Promise<void> {
    await this.downstreamTx.rollback()
  }

  addWrittenIds(table: string, ids: readonly string[]): void {
    const writtenIds = (this.writtenIdsByTable[table] ||= new Set())
    for (const id of ids) writtenIds.add(id)
  }

  async invalidateWrittenIds(): Promise<void> {
    const idsByTable = _mapValues<StringMap<string[]>>(
      this.writtenIdsByTable,
      (_, ids: Set<string>) => Array.from(ids),
    )
    await this.db.multiInvalidateCache(idsByTable)
  }
}

function formatRows(prefix: string, rows: readonly ObjectWithId[], source: string): string {
  return `${prefix} ${rows.length} rows ${source}: [${rows.map(r => r.id).join(', ')}]`
}
