import { _isEmptyObject, _isTruthy } from '@naturalcycles/js-lib'
import { _sum } from '@naturalcycles/js-lib/array'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { consoleLogger } from '@naturalcycles/js-lib/log'
import { _mapValues } from '@naturalcycles/js-lib/object'
import type { AnyObject, ObjectWithId, StringMap } from '@naturalcycles/js-lib/types'
import { _objectKeys, _stringMapEntries } from '@naturalcycles/js-lib/types'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import type { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import type { CommonDB, CommonDBSupport, CommonDBType } from '../../commondb/common.db.js'
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
  CacheDBOptions,
  CacheDBReadOptions,
  CacheDBSaveOptions,
  CacheDBStreamOptions,
  CacheFillToken,
} from './cache.db.model.js'
import { NoopDB } from './noop.db.js'

/**
 * CommonDB implementation that proxies requests to downstream CommonDB
 * and caches rows in the CommonDB implementation of a cache.
 *
 * It allows the cache to be scoped - typically to the request.
 *
 * Does not extend BaseCommonDB so when a new function is added to BaseCommonDB,
 * we get a type error here and we are forced to think about how it should work with caching.
 */
export class CacheDB implements CommonDB {
  constructor(cfg: CacheDBCfg) {
    _assert(!cfg.onlyCache || !cfg.skipCache, 'CacheDB: onlyCache and skipCache are both set')

    this.cfg = {
      ...cfg,
      logger: cfg.logger || consoleLogger,
    }
    this.dbType = cfg.downstreamDB.dbType
    this.support = {
      ...cfg.downstreamDB.support,
      createTable: false,
      increment: false,
      patchById: false,
      patchByQuery: false,
    }
  }

  cfg: CacheDBCfg & { logger: CommonLogger }
  dbType: CommonDBType
  support: CommonDBSupport

  private scopeCacheByScope = new WeakMap<AnyObject, ScopeCache>()
  private noopDB = new NoopDB()

  //#region CommonDB methods

  async ping(): Promise<void> {
    await Promise.all([this.getCacheDB().ping(), this.cfg.downstreamDB.ping()])
  }

  async getTables(): Promise<string[]> {
    return await this.cfg.downstreamDB.getTables()
  }

  async getTableSchema<ROW extends ObjectWithId>(table: string): Promise<JsonSchema<ROW>> {
    return await this.cfg.downstreamDB.getTableSchema<ROW>(table)
  }

  async createTable<ROW extends ObjectWithId>(
    _table: string,
    _schema: JsonSchema<ROW>,
  ): Promise<void> {
    throw new Error('CacheDB: createTable is not implemented')
  }

  async getByIds<ROW extends ObjectWithId>(
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
      const cachedRows = await this.getCacheDB().getByIds<ROW>(table, ids)
      const rows = cachedRows.map(copyRow)
      for (const r of rows) rowById.set(r.id, r)
      missingIds = ids.filter(id => !rowById.has(id))
      this.getCacheLogger()?.log(formatRows(`${table}.getByIds`, rows, 'from cache'))
    }

    if (this.useDownstream(opt) && missingIds.length) {
      const downstreamOpt = this.downstreamOpt(opt)
      const token = shouldReadCache ? this.getSaveAfterReadToken([table]) : undefined
      const rows = await this.cfg.downstreamDB.getByIds<ROW>(table, missingIds, downstreamOpt)
      for (const r of rows) rowById.set(r.id, r)
      this.getDownstreamLogger()?.log(formatRows(`${table}.getByIds`, rows, 'from downstream'))

      if (shouldReadCache && rows.length) {
        await this.saveCacheAfterRead({ [table]: rows }, token)
      }
    }

    // return in right order
    return ids.map(id => rowById.get(id)).filter(_isTruthy)
  }

  async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rows: readonly ROW[],
    opt: CacheDBSaveOptions<ROW> = {},
  ): Promise<void> {
    if (this.isInTransaction(opt)) {
      return await opt.tx.saveBatch(table, rows, opt)
    }

    if (this.useDownstream(opt)) {
      const ids = rows.map(r => r.id)
      await this.writeDownstream(
        () => this.cfg.downstreamDB.saveBatch(table, rows, this.downstreamOpt(opt)),
        () => this.invalidateCache(table, ids, opt),
      )
      this.getDownstreamLogger()?.log(formatRows(`${table}.saveBatch`, rows, 'to downstream'))
    }

    await this.saveCacheAfterWrite(table, rows, opt)
  }

  async patchById<ROW extends ObjectWithId>(
    _table: string,
    _id: string,
    _patch: Partial<ROW>,
  ): Promise<void> {
    throw new Error('CacheDB: patchById is not implemented')
  }

  async incrementBatch(
    _table: string,
    _prop: string,
    _incrementMap: StringMap<number>,
  ): Promise<StringMap<number>> {
    throw new Error('CacheDB: incrementBatch is not implemented')
  }

  async deleteByIds(
    table: string,
    ids: readonly string[],
    opt: CacheDBOptions = {},
  ): Promise<number> {
    if (this.isInTransaction(opt)) {
      return await opt.tx.deleteByIds(table, ids, opt)
    }

    if (this.isOnlyCache(opt)) {
      return await this.changeCache([table], cacheDB => cacheDB.deleteByIds(table, ids))
    }

    const deleted = await this.writeDownstream(
      () => this.cfg.downstreamDB.deleteByIds(table, ids, this.downstreamOpt(opt)),
      () => this.invalidateCache(table, ids, opt),
    )
    this.getDownstreamLogger()?.log(`${table}.deleteByIds ${deleted} rows from downstream`)

    await this.invalidateCache(table, ids, opt)

    return deleted
  }

  async multiGet<ROW extends ObjectWithId>(
    _idsByTable: StringMap<string[]>,
  ): Promise<StringMap<ROW[]>> {
    throw new Error('CacheDB: multiGet is not implemented')
  }

  async multiSave<ROW extends ObjectWithId>(_rowsByTable: StringMap<ROW[]>): Promise<void> {
    throw new Error('CacheDB: multiSave is not implemented')
  }

  async multiDelete(idsByTable: StringMap<string[]>, opt: CacheDBOptions = {}): Promise<number> {
    if (this.isInTransaction(opt)) {
      const { tx } = opt
      const entries = _stringMapEntries(idsByTable)
      const counts = await Promise.all(entries.map(([t, ids]) => tx.deleteByIds(t, ids, opt)))
      return _sum(counts)
    }

    if (this.isOnlyCache(opt)) {
      return await this.changeCache(_objectKeys(idsByTable), cacheDB =>
        this.multiDeleteCache(cacheDB, idsByTable),
      )
    }

    const deleted = await this.writeDownstream(
      () => this.cfg.downstreamDB.multiDelete(idsByTable, this.downstreamOpt(opt)),
      () => this.multiInvalidateCache(idsByTable, opt),
    )
    this.getDownstreamLogger()?.log(`multiDelete ${deleted} rows from downstream`)

    await this.multiInvalidateCache(idsByTable, opt)
    return deleted
  }

  async runQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt: CacheDBReadOptions = {},
  ): Promise<RunQueryResult<ROW>> {
    if (this.isOnlyCache(opt)) {
      const result = await this.getCacheDB().runQuery(q)
      this.getCacheLogger()?.log(`${q.table}.runQuery ${result.rows.length} rows from cache`)
      return { ...result, rows: result.rows.map(copyRow) }
    }

    const result = await this.cfg.downstreamDB.runQuery(q, this.downstreamOpt(opt))
    this.getDownstreamLogger()?.log(
      `${q.table}.runQuery ${result.rows.length} rows from downstream`,
    )
    return result
  }

  async runQueryCount<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt: CacheDBReadOptions = {},
  ): Promise<number> {
    if (this.isOnlyCache(opt)) {
      const count = await this.getCacheDB().runQueryCount(q)
      this.getCacheLogger()?.log(`${q.table}.runQueryCount ${count} rows from cache`)
      return count
    }

    return await this.cfg.downstreamDB.runQueryCount(q, this.downstreamOpt(opt))
  }

  streamQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt: CacheDBStreamOptions = {},
  ): Pipeline<ROW> {
    if (this.isOnlyCache(opt)) {
      return this.getCacheDB()
        .streamQuery<ROW>(q)
        .mapSimple(row => copyRow(row))
    }

    return this.cfg.downstreamDB.streamQuery<ROW>(q, this.downstreamOpt(opt))
  }

  async deleteByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt: CacheDBOptions = {},
  ): Promise<number> {
    if (this.isOnlyCache(opt)) {
      const deleted = await this.changeCache([q.table], cacheDB => cacheDB.deleteByQuery(q))
      this.getCacheLogger()?.log(`${q.table}.deleteByQuery ${deleted} rows from cache`)
      return deleted
    }

    const deleted = await this.writeDownstream(
      () => this.cfg.downstreamDB.deleteByQuery(q, this.downstreamOpt(opt)),
      () => this.invalidateCacheTable(q.table, opt),
    )
    this.getDownstreamLogger()?.log(
      `${q.table}.deleteByQuery ${deleted} rows from downstream and cache`,
    )

    await this.invalidateCacheTable(q.table, opt)
    return deleted
  }

  async patchByQuery<ROW extends ObjectWithId>(
    _q: DBQuery<ROW>,
    _patch: Partial<ROW>,
  ): Promise<number> {
    throw new Error('CacheDB: patchByQuery is not implemented')
  }

  async runInTransaction(fn: DBTransactionFn, opt?: CommonDBTransactionOptions): Promise<void> {
    this.assertTransactionSupported()
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
      await Promise.all(txs.map(tx => tx.invalidateWrittenRows()))
    }
  }

  async createTransaction(opt?: CommonDBTransactionOptions): Promise<DBTransaction> {
    this.assertTransactionSupported()
    const downstreamTx = await this.cfg.downstreamDB.createTransaction(opt)
    return new CacheDBTransaction(this, downstreamTx)
  }

  //#endregion

  private assertTransactionSupported(): void {
    _assert(!this.cfg.onlyCache, 'CacheDB: transactions are not supported with cfg.onlyCache')
  }

  getSaveAfterReadToken(tables: string[]): CacheFillToken {
    const versionByTable = this.getScopeCache()?.versionByTable || {}
    return Object.fromEntries(tables.map(table => [table, versionByTable[table] || 0]))
  }

  async saveCacheAfterRead<ROW extends ObjectWithId>(
    rowsByTable: StringMap<ROW[]>,
    token: CacheFillToken,
  ): Promise<void> {
    const scopeCache = this.getScopeCache()
    if (!scopeCache) return

    const { db, versionByTable } = scopeCache
    const tokenVersionByTable = token as StringMap<number>
    const saves = _stringMapEntries(rowsByTable)
      .filter(([table]) => (versionByTable[table] || 0) === tokenVersionByTable[table])
      .map(([table, rows]) => db.saveBatch(table, rows))
    await this.writeCache(Promise.all(saves))
  }

  private async saveCacheAfterWrite<ROW extends ObjectWithId>(
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
    const save = this.changeCache([table], cacheDB =>
      cacheDB.saveBatch(table, rows, { excludeFromIndexes }),
    )
    await this.writeCache(
      save.then(() => {
        this.getCacheLogger()?.log(formatRows(`${table}.saveBatch`, rows, 'to cache'))
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
    const deletion = this.changeCache([table], cacheDB => cacheDB.deleteByIds(table, validIds))
    await this.writeCache(deletion)
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

    const tables = _objectKeys(validIdsByTable)
    const deletion = this.changeCache(tables, cacheDB =>
      this.multiDeleteCache(cacheDB, validIdsByTable),
    )
    await this.writeCache(deletion)
  }

  async invalidateCacheTable(table: string, opt: CommonDBOptions = {}): Promise<void> {
    if (this.isInTransaction(opt)) {
      opt.tx.addWrittenTable(table)
    }
    const allRows = DBQuery.create(table)
    await this.writeCache(this.changeCache([table], cacheDB => cacheDB.deleteByQuery(allRows)))
  }

  private async multiDeleteCache(
    cacheDB: CommonDB,
    idsByTable: StringMap<string[]>,
  ): Promise<number> {
    const entries = _stringMapEntries(idsByTable)
    const counts = await Promise.all(entries.map(([table, ids]) => cacheDB.deleteByIds(table, ids)))
    return _sum(counts)
  }

  private async changeCache<T>(
    tables: string[],
    change: (cacheDB: CommonDB) => Promise<T>,
  ): Promise<T> {
    const scopeCache = this.getScopeCache()
    if (!scopeCache) return await change(this.noopDB)

    for (const table of tables) {
      scopeCache.versionByTable[table] = (scopeCache.versionByTable[table] || 0) + 1
    }

    return await change(scopeCache.db)
  }

  private getCacheDB(): CommonDB {
    return this.getScopeCache()?.db || this.noopDB
  }

  private getScopeCache(): ScopeCache | undefined {
    const scope = this.cfg.getCacheScope ? this.cfg.getCacheScope() : this
    if (!scope) return

    let scopeCache = this.scopeCacheByScope.get(scope)
    if (!scopeCache) {
      const db = this.cfg.createCacheDB?.() || this.noopDB
      scopeCache = { db, versionByTable: {} }
      this.scopeCacheByScope.set(scope, scopeCache)
    }

    return scopeCache
  }

  private async writeCache(promise: Promise<unknown>): Promise<void> {
    if (this.cfg.awaitCache) {
      await promise
      return
    }

    void promise.catch(err => this.cfg.logger.error('CacheDB: cache write failed', err))
  }

  private async writeDownstream<T>(
    write: () => Promise<T>,
    invalidate: () => Promise<void>,
  ): Promise<T> {
    try {
      return await write()
    } catch (err) {
      try {
        await invalidate()
      } catch (cacheErr) {
        this.cfg.logger.error('CacheDB: cache invalidation failed', { err: cacheErr })
      }
      throw err
    }
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
    _assert(!(opt as CacheDBOptions).onlyCache, 'CacheDB: opt.tx and opt.onlyCache are both set')
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
    _assert(!opt.onlyCache || !opt.tx, 'CacheDB: opt.tx and opt.onlyCache are both set')
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
  writtenTables = new Set<string>()

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
      await this.invalidateWrittenRows()
    }
  }

  async rollback(): Promise<void> {
    await this.downstreamTx.rollback()
  }

  addWrittenIds(table: string, ids: readonly string[]): void {
    const writtenIds = (this.writtenIdsByTable[table] ||= new Set())
    for (const id of ids) writtenIds.add(id)
  }

  addWrittenTable(table: string): void {
    this.writtenTables.add(table)
  }

  async invalidateWrittenRows(): Promise<void> {
    const idsByTable = _mapValues<StringMap<string[]>>(
      this.writtenIdsByTable,
      (_, ids: Set<string>) => Array.from(ids),
    )
    const tableInvalidations = [...this.writtenTables].map(t => this.db.invalidateCacheTable(t))
    await Promise.all([this.db.multiInvalidateCache(idsByTable), ...tableInvalidations])
  }
}

function formatRows(prefix: string, rows: readonly ObjectWithId[], source: string): string {
  return `${prefix} ${rows.length} rows ${source}: [${rows.map(r => r.id).join(', ')}]`
}

function copyRow<ROW extends AnyObject>(row: ROW): ROW {
  const copy: AnyObject = {}
  for (const key of _objectKeys(row)) {
    const value = row[key]
    // Copying Buffers is costly and `__compressed` is never mutated so we share it between copied rows
    const copiedValue = key === '__compressed' && Buffer.isBuffer(value) ? value : copyValue(value)
    if (copiedValue !== undefined) copy[key] = copiedValue
  }
  return copy as ROW
}

function copyValue(value: unknown): unknown {
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value + 0 : null
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined
  }
  if (value === null) return null
  if (Array.isArray(value)) return copyArray(value)
  if (Object.getPrototypeOf(value) === Object.prototype) return copyObject(value)
  if (Buffer.isBuffer(value)) return Buffer.from(value)
  return JSON.parse(JSON.stringify(value))
}

function copyObject(obj: AnyObject): AnyObject {
  const copy: AnyObject = {}
  for (const key of _objectKeys(obj)) {
    const value = copyValue(obj[key])
    if (value !== undefined) copy[key] = value
  }
  return copy
}

function copyArray(arr: unknown[]): unknown[] {
  const copy: unknown[] = []
  for (const item of arr) copy.push(copyValue(item) ?? null)
  return copy
}

interface ScopeCache {
  db: CommonDB
  versionByTable: StringMap<number>
}
