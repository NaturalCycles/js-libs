import { _isTruthy } from '@naturalcycles/js-lib'
import { _uniqBy } from '@naturalcycles/js-lib/array/array.util.js'
import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { _assert, ErrorMode } from '@naturalcycles/js-lib/error'
import { _deepJsonEquals } from '@naturalcycles/js-lib/object/deepEquals.js'
import {
  _filterUndefinedValues,
  _objectAssignExact,
  _pick,
} from '@naturalcycles/js-lib/object/object.util.js'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import {
  _objectKeys,
  _passthroughPredicate,
  _stringMapEntries,
  _stringMapValues,
  _typeCast,
  type BaseDBEntity,
  type NonNegativeInteger,
  type ObjectWithId,
  type StringMap,
  type Unsaved,
} from '@naturalcycles/js-lib/types'
import { stringId } from '@naturalcycles/nodejs-lib'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import type { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import { decompressZstdOrInflateToString, zstdCompress } from '@naturalcycles/nodejs-lib/zip'
import { DBLibError } from '../cnst.js'
import type {
  CommonDBSaveOptions,
  CommonDBTransactionOptions,
  RunQueryResult,
} from '../db.model.js'
import type { DBQuery } from '../query/dbQuery.js'
import { RunnableDBQuery } from '../query/dbQuery.js'
import type {
  CommonDaoCfg,
  CommonDaoCreateOptions,
  CommonDaoHooks,
  CommonDaoOptions,
  CommonDaoPatchByIdOptions,
  CommonDaoPatchOptions,
  CommonDaoReadOptions,
  CommonDaoSaveBatchOptions,
  CommonDaoSaveOptions,
  CommonDaoStreamDeleteOptions,
  CommonDaoStreamOptions,
  CommonDaoStreamSaveOptions,
} from './common.dao.model.js'
import { CommonDaoTransaction } from './commonDaoTransaction.js'

/**
 * Lowest common denominator API between supported Databases.
 *
 * DBM = Database model (how it's stored in DB)
 * BM = Backend model (optimized for API access)
 * TM = Transport model (optimized to be sent over the wire)
 */
export class CommonDao<
  BM extends BaseDBEntity,
  DBM extends BaseDBEntity = BM,
  ID extends string = BM['id'],
> {
  constructor(public cfg: CommonDaoCfg<BM, DBM, ID>) {
    this.cfg = {
      generateId: true,
      assignGeneratedIds: false,
      useCreatedProperty: true,
      useUpdatedProperty: true,
      validateOnLoad: true,
      validateOnSave: true,
      logger: console,
      ...cfg,
      hooks: {
        parseNaturalId: () => ({}),
        beforeCreate: bm => bm as BM,
        onValidationError: err => err,
        ...cfg.hooks,
      } satisfies Partial<CommonDaoHooks<BM, DBM, ID>>,
    }

    if (this.cfg.generateId) {
      this.cfg.hooks!.createRandomId ||= () => stringId() as ID
    } else {
      delete this.cfg.hooks!.createRandomId
    }
  }

  // CREATE
  create(part: Partial<BM> = {}, opt: CommonDaoOptions = {}): BM {
    const bm = this.cfg.hooks!.beforeCreate!(part)
    // First assignIdCreatedUpdated, then validate!
    this.assignIdCreatedUpdated(bm, opt)
    return this.validateAndConvert(bm, undefined, opt)
  }

  // GET
  async requireById(id: ID, opt: CommonDaoReadOptions = {}): Promise<BM> {
    const bm = await this.getById(id, opt)
    return this.ensureRequired(bm, id, opt)
  }

  async requireByIdAsDBM(id: ID, opt: CommonDaoReadOptions = {}): Promise<DBM> {
    const dbm = await this.getByIdAsDBM(id, opt)
    return this.ensureRequired(dbm, id, opt)
  }

  async getByIdOrEmpty(id: ID, part: Partial<BM> = {}, opt?: CommonDaoReadOptions): Promise<BM> {
    const bm = await this.getById(id, opt)
    if (bm) return bm

    return this.create({ ...part, id }, opt)
  }

  async getById(id?: ID | null, opt: CommonDaoReadOptions = {}): Promise<BM | null> {
    if (!id) return null
    const [dbm] = await this.loadByIds([id], opt)
    return await this.dbmToBM(dbm, opt)
  }

  async getByIdAsDBM(id?: ID | null, opt: CommonDaoReadOptions = {}): Promise<DBM | null> {
    if (!id) return null
    const [row] = await this.loadByIds([id], opt)
    return this.anyToDBM(row, opt) || null
  }

  async getByIds(ids: ID[], opt: CommonDaoReadOptions = {}): Promise<BM[]> {
    const dbms = await this.loadByIds(ids, opt)
    return await this.dbmsToBM(dbms, opt)
  }

  async getByIdsAsDBM(ids: ID[], opt: CommonDaoReadOptions = {}): Promise<DBM[]> {
    const rows = await this.loadByIds(ids, opt)
    return this.anyToDBMs(rows)
  }

  // DRY private method
  private async loadByIds(ids: ID[], opt: CommonDaoReadOptions = {}): Promise<DBM[]> {
    if (!ids.length) return []
    const table = opt.table || this.cfg.table
    return await (opt.tx || this.cfg.db).getByIds<DBM>(table, ids, opt)
  }

  async getBy(by: keyof DBM, value: any, limit = 0, opt?: CommonDaoReadOptions): Promise<BM[]> {
    return await this.query().filterEq(by, value).limit(limit).runQuery(opt)
  }

  async getOneBy(by: keyof DBM, value: any, opt?: CommonDaoReadOptions): Promise<BM | null> {
    const [bm] = await this.query().filterEq(by, value).limit(1).runQuery(opt)
    return bm || null
  }

  async getAll(opt?: CommonDaoReadOptions): Promise<BM[]> {
    return await this.query().runQuery(opt)
  }

  // QUERY
  /**
   * Pass `table` to override table
   */
  query(table?: string): RunnableDBQuery<BM, DBM, ID> {
    return new RunnableDBQuery<BM, DBM, ID>(this, table)
  }

  async runQuery(q: DBQuery<DBM>, opt?: CommonDaoReadOptions): Promise<BM[]> {
    const { rows } = await this.runQueryExtended(q, opt)
    return rows
  }

  async runQuerySingleColumn<T = any>(q: DBQuery<DBM>, opt?: CommonDaoReadOptions): Promise<T[]> {
    _assert(
      q._selectedFieldNames?.length === 1,
      `runQuerySingleColumn requires exactly 1 column to be selected: ${q.pretty()}`,
    )

    const col = q._selectedFieldNames[0]!

    const { rows } = await this.runQueryExtended(q, opt)
    return rows.map((r: any) => r[col])
  }

  /**
   * Convenience method that runs multiple queries in parallel and then merges their results together.
   * Does deduplication by id.
   * Order is not guaranteed, as queries run in parallel.
   */
  async runUnionQueries(queries: DBQuery<DBM>[], opt?: CommonDaoReadOptions): Promise<BM[]> {
    const results = (
      await pMap(queries, async q => (await this.runQueryExtended(q, opt)).rows)
    ).flat()
    return _uniqBy(results, r => r.id)
  }

  async runQueryExtended(
    q: DBQuery<DBM>,
    opt: CommonDaoReadOptions = {},
  ): Promise<RunQueryResult<BM>> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    const { rows, ...queryResult } = await this.cfg.db.runQuery<DBM>(q, opt)
    const isPartialQuery = !!q._selectedFieldNames
    const bms = isPartialQuery ? (rows as any[]) : await this.dbmsToBM(rows, opt)
    return {
      rows: bms,
      ...queryResult,
    }
  }

  async runQueryAsDBM(q: DBQuery<DBM>, opt?: CommonDaoReadOptions): Promise<DBM[]> {
    const { rows } = await this.runQueryExtendedAsDBM(q, opt)
    return rows
  }

  async runQueryExtendedAsDBM(
    q: DBQuery<DBM>,
    opt: CommonDaoReadOptions = {},
  ): Promise<RunQueryResult<DBM>> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    const { rows, ...queryResult } = await this.cfg.db.runQuery<DBM>(q, opt)
    const isPartialQuery = !!q._selectedFieldNames
    const dbms = isPartialQuery ? rows : this.anyToDBMs(rows, opt)
    return { rows: dbms, ...queryResult }
  }

  async runQueryCount(q: DBQuery<DBM>, opt: CommonDaoReadOptions = {}): Promise<number> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    return await this.cfg.db.runQueryCount(q, opt)
  }

  streamQueryAsDBM(q: DBQuery<DBM>, opt: CommonDaoStreamOptions<DBM> = {}): Pipeline<DBM> {
    const pipeline = this.streamQueryRaw(q, opt)

    const isPartialQuery = !!q._selectedFieldNames
    if (isPartialQuery) return pipeline

    opt.skipValidation ??= true
    opt.errorMode ||= ErrorMode.SUPPRESS

    return pipeline.mapSync(dbm => this.anyToDBM(dbm, opt), { errorMode: opt.errorMode })
  }

  streamQuery(q: DBQuery<DBM>, opt: CommonDaoStreamOptions<BM> = {}): Pipeline<BM> {
    const pipeline = this.streamQueryRaw(q, opt)

    const isPartialQuery = !!q._selectedFieldNames
    if (isPartialQuery) return pipeline as any as Pipeline<BM>

    opt.skipValidation ??= true
    opt.errorMode ||= ErrorMode.SUPPRESS

    return pipeline.map(async dbm => await this.dbmToBM(dbm, opt), { errorMode: opt.errorMode })
  }

  private streamQueryRaw(q: DBQuery<DBM>, opt: CommonDaoStreamOptions<any> = {}): Pipeline<DBM> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    return this.cfg.db.streamQuery<DBM>(q, opt)
  }

  async queryIds(q: DBQuery<DBM>, opt: CommonDaoReadOptions = {}): Promise<ID[]> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    const { rows } = await this.cfg.db.runQuery(q.select(['id']), opt)
    return rows.map(r => r.id as ID)
  }

  streamQueryIds(q: DBQuery<DBM>, opt: CommonDaoStreamOptions<ID> = {}): Pipeline<ID> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    opt.errorMode ||= ErrorMode.SUPPRESS

    return this.cfg.db.streamQuery(q.select(['id']), opt).mapSync((r: ObjectWithId) => r.id as ID)
  }

  /**
   * Mutates!
   */
  assignIdCreatedUpdated<T extends BaseDBEntity>(
    obj: Partial<T>,
    opt: CommonDaoOptions = {},
  ): void {
    const now = localTime.nowUnix()

    if (this.cfg.useCreatedProperty) {
      obj.created ||= obj.updated || now
    }

    if (this.cfg.useUpdatedProperty) {
      obj.updated = opt.preserveUpdated && obj.updated ? obj.updated : now
    }

    if (this.cfg.generateId) {
      obj.id ||= (this.cfg.hooks!.createNaturalId?.(obj as any) ||
        this.cfg.hooks!.createRandomId!()) as T['id']
    }
  }

  // SAVE
  /**
   * Convenience method to replace 3 operations (loading+patching+saving) with one:
   *
   * 1. Loads the row by id.
   * 1.1 Creates the row (via this.create()) if it doesn't exist
   * (this will cause a validation error if Patch has not enough data for the row to be valid).
   * 2. Applies the patch on top of loaded data.
   * 3. Saves (as fast as possible since the read) with the Patch applied, but only if the data has changed.
   */
  async patchById(
    id: ID,
    patch: Partial<BM>,
    opt: CommonDaoPatchByIdOptions<DBM> = {},
  ): Promise<BM> {
    if (this.cfg.patchInTransaction && !opt.tx) {
      // patchInTransaction means that we should run this op in Transaction
      // But if opt.tx is passed - means that we are already in a Transaction,
      // and should just continue as-is
      return await this.patchByIdInTransaction(id, patch, opt)
    }

    let patched: BM
    const loaded = await this.getById(id, {
      // Skipping validation here for performance reasons.
      // Validation is going to happen on save anyway, just down below.
      skipValidation: true,
      ...opt,
    })

    if (loaded) {
      patched = { ...loaded, ...patch }

      if (_deepJsonEquals(loaded, patched)) {
        // Skipping the save operation, as data is the same
        return patched
      }
    } else {
      const table = opt.table || this.cfg.table
      _assert(opt.createIfMissing, `DB row required, but not found in ${table}`, {
        id,
        table,
      })
      patched = this.create({ ...patch, id }, opt)
    }

    return await this.save(patched, opt)
  }

  /**
   * Like patchById, but runs all operations within a Transaction.
   */
  async patchByIdInTransaction(
    id: ID,
    patch: Partial<BM>,
    opt?: CommonDaoPatchByIdOptions<DBM>,
  ): Promise<BM> {
    return await this.runInTransaction(async daoTx => {
      return await this.patchById(id, patch, { ...opt, tx: daoTx.tx })
    })
  }

  /**
   * Same as patchById, but takes the whole object as input.
   * This "whole object" is mutated with the patch and returned.
   * Otherwise, similar behavior as patchById.
   * It still loads the row from the DB.
   */
  async patch(bm: BM, patch: Partial<BM>, opt: CommonDaoPatchOptions<DBM> = {}): Promise<BM> {
    if (this.cfg.patchInTransaction && !opt.tx) {
      // patchInTransaction means that we should run this op in Transaction
      // But if opt.tx is passed - means that we are already in a Transaction,
      // and should just continue as-is
      return await this.patchInTransaction(bm, patch, opt)
    }

    if (opt.skipDBRead) {
      const patched: BM = {
        ...bm,
        ...patch,
      }

      if (_deepJsonEquals(bm, patched)) {
        // Skipping the save operation, as data is the same
        return bm
      }
      Object.assign(bm, patch)
    } else {
      const loaded = await this.requireById(bm.id as ID, {
        // Skipping validation here for performance reasons.
        // Validation is going to happen on save anyway, just down below.
        skipValidation: true,
        ...opt,
      })

      const loadedWithPatch: BM = {
        ...loaded,
        ...patch,
      }

      // Make `bm` exactly the same as `loadedWithPatch`
      _objectAssignExact(bm, loadedWithPatch)

      if (_deepJsonEquals(loaded, loadedWithPatch)) {
        // Skipping the save operation, as data is the same
        return bm
      }
    }

    return await this.save(bm, opt)
  }

  /**
   * Like patch, but runs all operations within a Transaction.
   */
  async patchInTransaction(
    bm: BM,
    patch: Partial<BM>,
    opt?: CommonDaoSaveBatchOptions<DBM>,
  ): Promise<BM> {
    return await this.runInTransaction(async daoTx => {
      return await this.patch(bm, patch, { ...opt, tx: daoTx.tx })
    })
  }

  /**
   * Mutates with id, created, updated
   */
  async save(bm: Unsaved<BM>, opt: CommonDaoSaveOptions<BM, DBM> = {}): Promise<BM> {
    this.requireWriteAccess()

    if (opt.skipIfEquals) {
      // We compare with convertedBM, to account for cases when some extra property is assigned to bm,
      // which should be removed post-validation, but it breaks the "equality check"
      // Post-validation the equality check should work as intended
      const convertedBM = this.validateAndConvert(bm as Partial<BM>, 'save', opt)
      if (_deepJsonEquals(convertedBM, opt.skipIfEquals)) {
        // Skipping the save operation
        return bm as BM
      }
    }

    this.assignIdCreatedUpdated(bm, opt) // mutates
    _typeCast<BM>(bm)
    const dbm = await this.bmToDBM(bm, opt) // validates BM
    this.cfg.hooks!.beforeSave?.(dbm)
    const table = opt.table || this.cfg.table
    const saveOptions = this.prepareSaveOptions(opt)

    await (opt.tx || this.cfg.db).saveBatch(table, [dbm], saveOptions)

    if (saveOptions.assignGeneratedIds) {
      bm.id = dbm.id
    }

    return bm
  }

  async saveAsDBM(dbm: Unsaved<DBM>, opt: CommonDaoSaveOptions<BM, DBM> = {}): Promise<DBM> {
    this.requireWriteAccess()
    this.assignIdCreatedUpdated(dbm, opt) // mutates
    const row = this.anyToDBM(dbm, opt)
    this.cfg.hooks!.beforeSave?.(row)
    const table = opt.table || this.cfg.table
    const saveOptions = this.prepareSaveOptions(opt)

    await (opt.tx || this.cfg.db).saveBatch(table, [row], saveOptions)

    if (saveOptions.assignGeneratedIds) {
      dbm.id = row.id
    }

    return row
  }

  async saveBatch(bms: Unsaved<BM>[], opt: CommonDaoSaveBatchOptions<DBM> = {}): Promise<BM[]> {
    if (!bms.length) return []
    this.requireWriteAccess()
    bms.forEach(bm => this.assignIdCreatedUpdated(bm, opt))
    const dbms = await this.bmsToDBM(bms as BM[], opt)
    if (this.cfg.hooks!.beforeSave) {
      dbms.forEach(dbm => this.cfg.hooks!.beforeSave!(dbm))
    }
    const table = opt.table || this.cfg.table
    const saveOptions = this.prepareSaveOptions(opt)

    await (opt.tx || this.cfg.db).saveBatch(table, dbms, saveOptions)

    if (saveOptions.assignGeneratedIds) {
      dbms.forEach((dbm, i) => (bms[i]!.id = dbm.id))
    }

    return bms as BM[]
  }

  async saveBatchAsDBM(
    dbms: Unsaved<DBM>[],
    opt: CommonDaoSaveBatchOptions<DBM> = {},
  ): Promise<DBM[]> {
    if (!dbms.length) return []
    this.requireWriteAccess()
    dbms.forEach(dbm => this.assignIdCreatedUpdated(dbm, opt))
    const rows = this.anyToDBMs(dbms as DBM[], opt)
    if (this.cfg.hooks!.beforeSave) {
      rows.forEach(row => this.cfg.hooks!.beforeSave!(row))
    }
    const table = opt.table || this.cfg.table
    const saveOptions = this.prepareSaveOptions(opt)

    await (opt.tx || this.cfg.db).saveBatch(table, rows, saveOptions)

    if (saveOptions.assignGeneratedIds) {
      rows.forEach((row, i) => (dbms[i]!.id = row.id))
    }

    return rows
  }

  private prepareSaveOptions(opt: CommonDaoSaveOptions<BM, DBM>): CommonDBSaveOptions<DBM> {
    let {
      saveMethod,
      assignGeneratedIds = this.cfg.assignGeneratedIds,
      excludeFromIndexes = this.cfg.excludeFromIndexes,
    } = opt
    if (this.cfg.immutable && !opt.allowMutability && !opt.saveMethod) {
      saveMethod = 'insert'
    }

    return {
      ...opt,
      excludeFromIndexes,
      saveMethod,
      assignGeneratedIds,
    }
  }

  /**
   * "Streaming" is implemented by buffering incoming rows into **batches**
   * (of size opt.chunkSize, which defaults to 500),
   * and then executing db.saveBatch(chunk) with the concurrency
   * of opt.chunkConcurrency (which defaults to 32).
   *
   * It takes a Pipeline as input, appends necessary saving transforms to it,
   * and calls .run() on it.
   */
  async streamSave(p: Pipeline<BM>, opt: CommonDaoStreamSaveOptions<DBM> = {}): Promise<void> {
    this.requireWriteAccess()

    const table = opt.table || this.cfg.table
    opt.skipValidation ??= true
    opt.errorMode ||= ErrorMode.SUPPRESS

    if (this.cfg.immutable && !opt.allowMutability && !opt.saveMethod) {
      opt = { ...opt, saveMethod: 'insert' }
    }

    const excludeFromIndexes = opt.excludeFromIndexes || this.cfg.excludeFromIndexes
    const { beforeSave } = this.cfg.hooks!

    const { chunkSize = 500, chunkConcurrency = 32, errorMode } = opt

    await p
      .map(
        async bm => {
          this.assignIdCreatedUpdated(bm, opt)
          const dbm = await this.bmToDBM(bm, opt)
          beforeSave?.(dbm)
          return dbm
        },
        { errorMode },
      )
      .chunk(chunkSize)
      .map(
        async batch => {
          await this.cfg.db.saveBatch(table, batch, {
            ...opt,
            excludeFromIndexes,
          })
          return batch
        },
        {
          concurrency: chunkConcurrency,
          errorMode,
        },
      )
      .logProgress({
        metric: 'saved',
        ...opt,
      })
      .run()
  }

  // DELETE
  /**
   * @returns number of deleted items
   */
  async deleteById(id?: ID | null, opt: CommonDaoOptions = {}): Promise<number> {
    if (!id) return 0
    return await this.deleteByIds([id], opt)
  }

  async deleteByIds(ids: ID[], opt: CommonDaoOptions = {}): Promise<number> {
    if (!ids.length) return 0
    this.requireWriteAccess()
    this.requireObjectMutability(opt)
    const table = opt.table || this.cfg.table
    return await (opt.tx || this.cfg.db).deleteByIds(table, ids, opt)
  }

  /**
   * Pass `chunkSize: number` (e.g 500) option to use Streaming: it will Stream the query, chunk by 500, and execute
   * `deleteByIds` for each chunk concurrently (infinite concurrency).
   * This is expected to be more memory-efficient way of deleting large number of rows.
   */
  async deleteByQuery(
    q: DBQuery<DBM>,
    opt: CommonDaoStreamDeleteOptions<DBM> = {},
  ): Promise<number> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    this.requireWriteAccess()
    this.requireObjectMutability(opt)
    q.table = opt.table || q.table
    let deleted = 0

    if (opt.chunkSize) {
      const { chunkSize, chunkConcurrency = 8 } = opt

      await this.cfg.db
        .streamQuery<DBM>(q.select(['id']), opt)
        .mapSync(r => r.id)
        .chunk(chunkSize)
        .map(
          async ids => {
            await this.cfg.db.deleteByIds(q.table, ids, opt)
            deleted += ids.length
          },
          {
            predicate: _passthroughPredicate,
            concurrency: chunkConcurrency,
            errorMode: opt.errorMode || ErrorMode.THROW_IMMEDIATELY,
          },
        )
        // LogProgress should be AFTER the mapper, to be able to report correct stats
        .logProgress({
          metric: q.table,
          logEvery: 2, // 500 * 2 === 1000
          chunkSize,
          ...opt,
        })
        .run()
    } else {
      deleted = await this.cfg.db.deleteByQuery(q, opt)
    }

    return deleted
  }

  async patchByIds(ids: ID[], patch: Partial<DBM>, opt: CommonDaoOptions = {}): Promise<number> {
    if (!ids.length) return 0
    return await this.patchByQuery(this.query().filterIn('id', ids), patch, opt)
  }

  async patchByQuery(
    q: DBQuery<DBM>,
    patch: Partial<DBM>,
    opt: CommonDaoOptions = {},
  ): Promise<number> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    this.requireWriteAccess()
    this.requireObjectMutability(opt)
    q.table = opt.table || q.table
    return await this.cfg.db.patchByQuery(q, patch, opt)
  }

  /**
   * Caveat: it doesn't update created/updated props.
   *
   * @experimental
   */
  async increment(prop: keyof DBM, id: ID, by = 1, opt: CommonDaoOptions = {}): Promise<number> {
    this.requireWriteAccess()
    this.requireObjectMutability(opt)
    const { table } = this.cfg
    const result = await this.cfg.db.incrementBatch(table, prop as string, {
      [id]: by,
    })
    return result[id]!
  }

  /**
   * Caveat: it doesn't update created/updated props.
   *
   * @experimental
   */
  async incrementBatch(
    prop: keyof DBM,
    incrementMap: StringMap<number>,
    opt: CommonDaoOptions = {},
  ): Promise<StringMap<number>> {
    this.requireWriteAccess()
    this.requireObjectMutability(opt)
    const { table } = this.cfg
    return await this.cfg.db.incrementBatch(table, prop as string, incrementMap)
  }

  // CONVERSIONS

  async dbmToBM(_dbm: undefined, opt?: CommonDaoOptions): Promise<null>
  async dbmToBM(_dbm?: DBM, opt?: CommonDaoOptions): Promise<BM>
  async dbmToBM(_dbm?: DBM, opt: CommonDaoOptions = {}): Promise<BM | null> {
    if (!_dbm) return null

    // optimization: no need to run full joi DBM validation, cause BM validation will be run
    // const dbm = this.anyToDBM(_dbm, opt)
    const dbm: DBM = { ..._dbm, ...this.cfg.hooks!.parseNaturalId!(_dbm.id as ID) }

    // Decompress
    await this.decompress(dbm)

    // DBM > BM
    const bm = ((await this.cfg.hooks!.beforeDBMToBM?.(dbm)) || dbm) as Partial<BM>

    // Validate/convert BM
    return this.validateAndConvert(bm, 'load', opt)
  }

  async dbmsToBM(dbms: DBM[], opt: CommonDaoOptions = {}): Promise<BM[]> {
    return await pMap(dbms, async dbm => await this.dbmToBM(dbm, opt))
  }

  /**
   * Mutates object with properties: id, created, updated.
   * Returns DBM (new reference).
   */
  async bmToDBM(bm: undefined, opt?: CommonDaoOptions): Promise<null>
  async bmToDBM(bm?: BM, opt?: CommonDaoOptions): Promise<DBM>
  async bmToDBM(bm?: BM, opt?: CommonDaoOptions): Promise<DBM | null> {
    if (bm === undefined) return null

    // bm gets assigned to the new reference
    bm = this.validateAndConvert(bm, 'save', opt)

    // BM > DBM
    const dbm = ((await this.cfg.hooks!.beforeBMToDBM?.(bm)) || bm) as DBM

    // Compress
    if (this.cfg.compress) await this.compress(dbm)

    return dbm
  }

  async bmsToDBM(bms: BM[], opt: CommonDaoOptions = {}): Promise<DBM[]> {
    // try/catch?
    return await pMap(bms, async bm => await this.bmToDBM(bm, opt))
  }

  async compress(dbm: DBM): Promise<DBM> {
    if (!this.cfg.compress) return dbm // No compression requested

    const { keys } = this.cfg.compress
    const properties = _pick(dbm, keys)
    _assert(
      !Object.hasOwn(dbm, 'data') || Object.hasOwn(properties, 'data'),
      `Data (${dbm.id}) already has a "data" property. When using compression, this property must be included in the compression keys list.`,
    )
    const bufferString = JSON.stringify(properties)
    const data = await zstdCompress(bufferString)
    for (const key of _objectKeys(properties)) {
      ;(dbm as any)[key] = undefined
    }
    Object.assign(dbm, { data })

    return dbm
  }

  async decompress(dbm: DBM): Promise<DBM> {
    _typeCast<Compressed<DBM>>(dbm)
    if (!Buffer.isBuffer(dbm.data)) return dbm // No compressed data

    // try-catch to avoid a `data` with Buffer which is not compressed, but legit data
    try {
      const bufferString = await decompressZstdOrInflateToString(dbm.data)
      const properties = JSON.parse(bufferString)
      dbm.data = undefined
      Object.assign(dbm, properties)
    } catch {}

    return dbm
  }

  anyToDBM(dbm: undefined, opt?: CommonDaoOptions): null
  anyToDBM(dbm?: any, opt?: CommonDaoOptions): DBM
  anyToDBM(dbm?: DBM, _opt: CommonDaoOptions = {}): DBM | null {
    if (!dbm) return null

    // this shouldn't be happening on load! but should on save!
    // this.assignIdCreatedUpdated(dbm, opt)

    dbm = { ...dbm, ...this.cfg.hooks!.parseNaturalId!(dbm.id as ID) }

    // Validate/convert DBM
    // return this.validateAndConvert(dbm, this.cfg.dbmSchema, DBModelType.DBM, opt)
    return dbm
  }

  anyToDBMs(rows: DBM[], opt: CommonDaoOptions = {}): DBM[] {
    return rows.map(entity => this.anyToDBM(entity, opt))
  }

  /**
   * Returns *converted value* (NOT the same reference).
   * Does NOT mutate the object.
   * Validates (unless `skipValidation=true` passed).
   */
  private validateAndConvert(
    input: Partial<BM>,
    op?: 'load' | 'save', // this is to skip validation if validateOnLoad/Save is false
    opt: CommonDaoOptions = {},
  ): BM {
    // We still filter `undefined` values here, because `beforeDBMToBM` can return undefined values
    // and they can be annoying with snapshot tests
    input = _filterUndefinedValues(input)

    // Return as is if no schema is passed or if `skipConversion` is set
    if (
      !this.cfg.validateBM ||
      opt.skipValidation ||
      (op === 'load' && !this.cfg.validateOnLoad) ||
      (op === 'save' && !this.cfg.validateOnSave)
    ) {
      return input as BM
    }

    const inputName = opt.table || this.cfg.table

    const [error, convertedValue] = this.cfg.validateBM(input as BM, {
      // Passing `mutateInput` through allows to opt-out of mutation
      // for individual operations, e.g `someDao.save(myObj, { mutateInput: false })`
      // Default is undefined (the validation function decides whether to mutate or not).
      mutateInput: opt.mutateInput,
      inputName,
    })

    if (error) {
      const processedError = this.cfg.hooks!.onValidationError!(error)
      if (processedError) throw processedError
    }

    return convertedValue
  }

  async getTableSchema(): Promise<JsonSchema<any, DBM>> {
    return await this.cfg.db.getTableSchema<DBM>(this.cfg.table)
  }

  async createTable(schema: JsonSchema<any, DBM>, opt?: CommonDaoCreateOptions): Promise<void> {
    this.requireWriteAccess()
    await this.cfg.db.createTable(this.cfg.table, schema, opt)
  }

  /**
   * Proxy to this.cfg.db.ping
   */
  async ping(): Promise<void> {
    await this.cfg.db.ping()
  }

  withId(id: ID): DaoWithId<CommonDao<BM, DBM, ID>> {
    return {
      dao: this,
      id,
    }
  }

  withIds(ids: ID[]): DaoWithIds<CommonDao<BM, DBM, ID>> {
    return {
      dao: this,
      ids,
    }
  }

  withRowsToSave(rows: Unsaved<BM>[]): DaoWithRows<CommonDao<BM, DBM, ID>> {
    return {
      dao: this,
      rows: rows as any,
    }
  }

  withRowToSave(row: Unsaved<BM>, opt?: DaoWithRowOptions<BM>): DaoWithRow<CommonDao<BM, DBM, ID>> {
    return {
      dao: this,
      row: row as any,
      opt: opt as any,
    }
  }

  /**
   * Load rows (by their ids) from Multiple tables at once.
   * An optimized way to load data, minimizing DB round-trips.
   *
   * @experimental
   */
  static async multiGet<MAP extends Record<string, DaoWithIds<AnyDao> | DaoWithId<AnyDao>>>(
    inputMap: MAP,
    opt: CommonDaoReadOptions = {},
  ): Promise<{
    [K in keyof MAP]: MAP[K] extends DaoWithIds<any>
      ? InferBM<MAP[K]['dao']>[]
      : InferBM<MAP[K]['dao']> | null
  }> {
    const db = Object.values(inputMap)[0]?.dao.cfg.db
    if (!db) {
      return {} as any
    }

    const idsByTable = CommonDao.prepareMultiGetIds(inputMap)

    // todo: support tx
    const dbmsByTable = await db.multiGet(idsByTable, opt)

    const dbmByTableById = CommonDao.multiGetMapByTableById(dbmsByTable)

    return (await CommonDao.prepareMultiGetOutput(inputMap, dbmByTableById, opt)) as any
  }

  private static prepareMultiGetIds(
    inputMap: StringMap<DaoWithIds<AnyDao> | DaoWithId<AnyDao>>,
  ): StringMap<string[]> {
    const idSetByTable: StringMap<Set<string>> = {}

    for (const input of _stringMapValues(inputMap)) {
      const { table } = input.dao.cfg
      idSetByTable[table] ||= new Set()
      if ('id' in input) {
        // Singular
        idSetByTable[table].add(input.id)
      } else {
        // Plural
        for (const id of input.ids) {
          idSetByTable[table].add(id)
        }
      }
    }

    const idsByTable: StringMap<string[]> = {}
    for (const [table, idSet] of _stringMapEntries(idSetByTable)) {
      idsByTable[table] = [...idSet]
    }
    return idsByTable
  }

  private static multiGetMapByTableById(
    dbmsByTable: StringMap<ObjectWithId[]>,
  ): StringMap<StringMap<ObjectWithId>> {
    // We create this "map of maps", to be able to track the results back to the input props
    // This is needed to support:
    // - having multiple props from the same table
    const dbmByTableById: StringMap<StringMap<ObjectWithId>> = {}
    for (const [table, dbms] of _stringMapEntries(dbmsByTable)) {
      dbmByTableById[table] ||= {}
      for (const dbm of dbms) {
        dbmByTableById[table][dbm.id] = dbm
      }
    }

    return dbmByTableById
  }

  private static async prepareMultiGetOutput(
    inputMap: StringMap<DaoWithIds<AnyDao> | DaoWithId<AnyDao>>,
    dbmByTableById: StringMap<StringMap<ObjectWithId>>,
    opt: CommonDaoReadOptions = {},
  ): Promise<StringMap<unknown>> {
    const bmsByProp: StringMap<unknown> = {}

    // Loop over input props again, to produce the output of the same shape as requested
    await pMap(_stringMapEntries(inputMap), async ([prop, input]) => {
      const { dao } = input
      const { table } = dao.cfg
      if ('id' in input) {
        // Singular
        const dbm = dbmByTableById[table]![input.id]
        bmsByProp[prop] = (await dao.dbmToBM(dbm, opt)) || null
      } else {
        // Plural
        // We apply filtering, to be able to support multiple input props fetching from the same table.
        // Without filtering - every prop will get ALL rows from that table.
        const dbms = input.ids.map(id => dbmByTableById[table]![id]).filter(_isTruthy)
        bmsByProp[prop] = await dao.dbmsToBM(dbms, opt)
      }
    })

    return bmsByProp as any
  }

  /**
   * @experimental
   */
  static async multiDelete(
    inputs: (DaoWithId<AnyDao> | DaoWithIds<AnyDao>)[],
    opt: CommonDaoOptions = {},
  ): Promise<NonNegativeInteger> {
    if (!inputs.length) return 0
    const { db } = inputs[0]!.dao.cfg
    const idsByTable: StringMap<string[]> = {}
    for (const input of inputs) {
      const { dao } = input
      const { table } = dao.cfg
      dao.requireWriteAccess()
      dao.requireObjectMutability(opt)
      idsByTable[table] ||= []

      if ('id' in input) {
        idsByTable[table].push(input.id)
      } else {
        idsByTable[table].push(...input.ids)
      }
    }

    return await db.multiDelete(idsByTable, opt)
  }

  static async multiSave(
    inputs: (DaoWithRows<AnyDao> | DaoWithRow<AnyDao>)[],
    opt: CommonDaoSaveBatchOptions<any> = {},
  ): Promise<void> {
    if (!inputs.length) return
    const { db } = inputs[0]!.dao.cfg
    const dbmsByTable: StringMap<any[]> = {}
    await pMap(inputs, async input => {
      const { dao } = input
      const { table } = dao.cfg
      dbmsByTable[table] ||= []

      if ('row' in input) {
        // Singular
        const { row } = input

        if (input.opt?.skipIfEquals) {
          // We compare with convertedBM, to account for cases when some extra property is assigned to bm,
          // which should be removed post-validation, but it breaks the "equality check"
          // Post-validation the equality check should work as intended
          const convertedBM = dao.validateAndConvert(row, 'save', opt)
          if (_deepJsonEquals(convertedBM, input.opt.skipIfEquals)) {
            // Skipping the save operation
            return
          }
        }

        dao.assignIdCreatedUpdated(row, opt)
        const dbm = await dao.bmToDBM(row, opt)
        dao.cfg.hooks!.beforeSave?.(dbm)
        dbmsByTable[table].push(dbm)
      } else {
        // Plural
        input.rows.forEach(bm => dao.assignIdCreatedUpdated(bm, opt))
        const dbms = await dao.bmsToDBM(input.rows, opt)
        if (dao.cfg.hooks!.beforeSave) {
          dbms.forEach(dbm => dao.cfg.hooks!.beforeSave!(dbm))
        }
        dbmsByTable[table].push(...dbms)
      }
    })

    await db.multiSave(dbmsByTable)
  }

  async createTransaction(opt?: CommonDBTransactionOptions): Promise<CommonDaoTransaction> {
    const tx = await this.cfg.db.createTransaction(opt)
    return new CommonDaoTransaction(tx, this.cfg.logger!)
  }

  async runInTransaction<T = void>(
    fn: CommonDaoTransactionFn<T>,
    opt?: CommonDBTransactionOptions,
  ): Promise<T> {
    let r: T

    await this.cfg.db.runInTransaction(async tx => {
      const daoTx = new CommonDaoTransaction(tx, this.cfg.logger!)

      try {
        r = await fn(daoTx)
      } catch (err) {
        await daoTx.rollback() // graceful rollback that "never throws"
        throw err
      }
    }, opt)

    return r!
  }

  private ensureRequired<ROW>(row: ROW, id: string, opt: CommonDaoOptions): NonNullable<ROW> {
    const table = opt.table || this.cfg.table
    _assert(row, `DB row required, but not found in ${table}`, {
      table,
      id,
    })
    return row // pass-through
  }

  /**
   * Throws if readOnly is true
   */
  private requireWriteAccess(): void {
    _assert(!this.cfg.readOnly, DBLibError.DAO_IS_READ_ONLY, {
      table: this.cfg.table,
    })
  }

  /**
   * Throws if readOnly is true
   */
  private requireObjectMutability(opt: CommonDaoOptions): void {
    _assert(!this.cfg.immutable || opt.allowMutability, DBLibError.OBJECT_IS_IMMUTABLE, {
      table: this.cfg.table,
    })
  }

  /**
   * Throws if query uses a property that is in `excludeFromIndexes` list.
   */
  private validateQueryIndexes(q: DBQuery<DBM>): void {
    const { excludeFromIndexes, indexes } = this.cfg

    if (excludeFromIndexes) {
      for (const f of q._filters) {
        _assert(
          !excludeFromIndexes.includes(f.name),
          `cannot query on non-indexed property: ${this.cfg.table}.${f.name as string}`,
          {
            query: q.pretty(),
          },
        )
      }
    }

    if (indexes) {
      for (const f of q._filters) {
        _assert(
          f.name === 'id' || indexes.includes(f.name),
          `cannot query on non-indexed property: ${this.cfg.table}.${f.name as string}`,
          {
            query: q.pretty(),
          },
        )
      }
    }
  }
}

/**
 * Transaction is committed when the function returns resolved Promise (aka "returns normally").
 *
 * Transaction is rolled back when the function returns rejected Promise (aka "throws").
 */
export type CommonDaoTransactionFn<T = void> = (tx: CommonDaoTransaction) => Promise<T>

export interface DaoWithIds<DAO extends AnyDao> {
  dao: DAO
  ids: string[]
}

export interface DaoWithId<DAO extends AnyDao> {
  dao: DAO
  id: string
}

export interface DaoWithRows<DAO extends AnyDao, BM = InferBM<DAO>> {
  dao: DAO
  rows: Unsaved<BM>[]
}

export interface DaoWithRow<DAO extends AnyDao, BM = InferBM<DAO>> {
  dao: DAO
  row: Unsaved<BM>
  opt?: DaoWithRowOptions<BM>
}

export interface DaoWithRowOptions<BM> {
  skipIfEquals?: BM
}

export type InferBM<DAO> = DAO extends CommonDao<infer BM> ? BM : never
export type InferDBM<DAO> = DAO extends CommonDao<any, infer DBM> ? DBM : never
export type InferID<DAO> = DAO extends CommonDao<any, any, infer ID> ? ID : never

export type AnyDao = CommonDao<any>

/**
 * Represents a DBM whose properties have been compressed into a `data` Buffer.
 *
 * Used internally during compression/decompression so that DBM instances can
 * carry their compressed payload alongside the original type shape.
 */
type Compressed<DBM> = DBM & { data?: Buffer }
