import type { Transform } from 'node:stream'
import type {
  AsyncMapper,
  BaseDBEntity,
  CommonLogger,
  JsonSchemaObject,
  JsonSchemaRootObject,
  ObjectWithId,
  StringMap,
  UnixTimestampMillis,
  Unsaved,
} from '@naturalcycles/js-lib'
import {
  _assert,
  _deepCopy,
  _deepJsonEquals,
  _filterUndefinedValues,
  _isTruthy,
  _objectAssignExact,
  _passthroughPredicate,
  _since,
  _truncate,
  _typeCast,
  _uniqBy,
  AppError,
  ErrorMode,
  localTime,
  pMap,
  SKIP,
} from '@naturalcycles/js-lib'
import type { ZodValidationError } from '@naturalcycles/js-lib/zod'
import { ZodType, zSafeValidate } from '@naturalcycles/js-lib/zod'
import type {
  AjvValidationError,
  JoiValidationError,
  ObjectSchema,
  ReadableTyped,
} from '@naturalcycles/nodejs-lib'
import {
  _pipeline,
  AjvSchema,
  getValidationResult,
  stringId,
  transformChunk,
  transformLogProgress,
  transformMap,
  transformNoOp,
  writableVoid,
} from '@naturalcycles/nodejs-lib'
import { DBLibError } from '../cnst.js'
import type { CommonDBTransactionOptions, DBTransaction, RunQueryResult } from '../db.model.js'
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
  CommonDaoStreamForEachOptions,
  CommonDaoStreamOptions,
  CommonDaoStreamSaveOptions,
} from './common.dao.model.js'
import { CommonDaoLogLevel } from './common.dao.model.js'

/**
 * Lowest common denominator API between supported Databases.
 *
 * DBM = Database model (how it's stored in DB)
 * BM = Backend model (optimized for API access)
 * TM = Transport model (optimized to be sent over the wire)
 */
export class CommonDao<BM extends BaseDBEntity, DBM extends BaseDBEntity = BM, ID = BM['id']> {
  constructor(public cfg: CommonDaoCfg<BM, DBM, ID>) {
    this.cfg = {
      logLevel: CommonDaoLogLevel.NONE,
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
        anonymize: dbm => dbm,
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
    return this.validateAndConvert(bm, this.cfg.bmSchema, undefined, opt)
  }

  // GET
  // overrides are disabled now, as they obfuscate errors when ID branded type is used
  // async getById(id: undefined | null, opt?: CommonDaoOptions): Promise<null>
  // async getById(id?: ID | null, opt?: CommonDaoOptions): Promise<BM | null>
  async getById(id?: ID | null, opt: CommonDaoReadOptions = {}): Promise<BM | null> {
    if (!id) return null
    const op = `getById(${id})`
    const table = opt.table || this.cfg.table
    const started = this.logStarted(op, table)

    let dbm = (await (opt.tx || this.cfg.db).getByIds<DBM>(table, [id as string], opt))[0]
    if (dbm && this.cfg.hooks!.afterLoad) {
      dbm = (await this.cfg.hooks!.afterLoad(dbm)) || undefined
    }

    const bm = await this.dbmToBM(dbm, opt)
    this.logResult(started, op, bm, table)
    return bm || null
  }

  async getByIdOrEmpty(id: ID, part: Partial<BM> = {}, opt?: CommonDaoReadOptions): Promise<BM> {
    const bm = await this.getById(id, opt)
    if (bm) return bm

    return this.create({ ...part, id }, opt)
  }

  // async getByIdAsDBM(id: undefined | null, opt?: CommonDaoOptions): Promise<null>
  // async getByIdAsDBM(id?: ID | null, opt?: CommonDaoOptions): Promise<DBM | null>
  async getByIdAsDBM(id?: ID | null, opt: CommonDaoReadOptions = {}): Promise<DBM | null> {
    if (!id) return null
    const op = `getByIdAsDBM(${id})`
    const table = opt.table || this.cfg.table
    const started = this.logStarted(op, table)
    let [dbm] = await (opt.tx || this.cfg.db).getByIds<DBM>(table, [id as string], opt)
    if (dbm && this.cfg.hooks!.afterLoad) {
      dbm = (await this.cfg.hooks!.afterLoad(dbm)) || undefined
    }

    dbm = this.anyToDBM(dbm!, opt)
    this.logResult(started, op, dbm, table)
    return dbm || null
  }

  async getByIds(ids: ID[], opt: CommonDaoReadOptions = {}): Promise<BM[]> {
    if (!ids.length) return []
    const op = `getByIds ${ids.length} id(s) (${_truncate(ids.slice(0, 10).join(', '), 50)})`
    const table = opt.table || this.cfg.table
    const started = this.logStarted(op, table)
    let dbms = await (opt.tx || this.cfg.db).getByIds<DBM>(table, ids as string[], opt)
    if (this.cfg.hooks!.afterLoad && dbms.length) {
      dbms = (await pMap(dbms, async dbm => await this.cfg.hooks!.afterLoad!(dbm))).filter(
        _isTruthy,
      )
    }

    const bms = await this.dbmsToBM(dbms, opt)
    this.logResult(started, op, bms, table)
    return bms
  }

  async getByIdsAsDBM(ids: ID[], opt: CommonDaoReadOptions = {}): Promise<DBM[]> {
    if (!ids.length) return []
    const op = `getByIdsAsDBM ${ids.length} id(s) (${_truncate(ids.slice(0, 10).join(', '), 50)})`
    const table = opt.table || this.cfg.table
    const started = this.logStarted(op, table)
    let dbms = await (opt.tx || this.cfg.db).getByIds<DBM>(table, ids as string[], opt)
    if (this.cfg.hooks!.afterLoad && dbms.length) {
      dbms = (await pMap(dbms, async dbm => await this.cfg.hooks!.afterLoad!(dbm))).filter(
        _isTruthy,
      )
    }

    this.logResult(started, op, dbms, table)
    return dbms
  }

  async requireById(id: ID, opt: CommonDaoReadOptions = {}): Promise<BM> {
    const r = await this.getById(id, opt)
    if (!r) {
      this.throwRequiredError(id, opt)
    }
    return r
  }

  async requireByIdAsDBM(id: ID, opt: CommonDaoReadOptions = {}): Promise<DBM> {
    const r = await this.getByIdAsDBM(id, opt)
    if (!r) {
      this.throwRequiredError(id, opt)
    }
    return r
  }

  private throwRequiredError(id: ID, opt: CommonDaoOptions): never {
    const table = opt.table || this.cfg.table
    throw new AppError(`DB row required, but not found in ${table}`, {
      table,
      id,
    })
  }

  /**
   * Throws if readOnly is true
   */
  private requireWriteAccess(): void {
    if (this.cfg.readOnly) {
      throw new AppError(DBLibError.DAO_IS_READ_ONLY, {
        table: this.cfg.table,
      })
    }
  }

  /**
   * Throws if readOnly is true
   */
  private requireObjectMutability(opt: CommonDaoOptions): void {
    if (this.cfg.immutable && !opt.allowMutability) {
      throw new AppError(DBLibError.OBJECT_IS_IMMUTABLE, {
        table: this.cfg.table,
      })
    }
  }

  private async ensureUniqueId(table: string, dbm: DBM): Promise<void> {
    // todo: retry N times
    const existing = await this.cfg.db.getByIds<DBM>(table, [dbm.id])
    if (existing.length) {
      throw new AppError(DBLibError.NON_UNIQUE_ID, {
        table,
        ids: existing.map(i => i.id),
      })
    }
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
    const op = `runQuery(${q.pretty()})`
    const started = this.logStarted(op, q.table)
    let { rows, ...queryResult } = await this.cfg.db.runQuery<DBM>(q, opt)
    const partialQuery = !!q._selectedFieldNames
    if (this.cfg.hooks!.afterLoad && rows.length) {
      rows = (await pMap(rows, async dbm => await this.cfg.hooks!.afterLoad!(dbm))).filter(
        _isTruthy,
      )
    }

    const bms = partialQuery ? (rows as any[]) : await this.dbmsToBM(rows, opt)
    this.logResult(started, op, bms, q.table)
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
    const op = `runQueryAsDBM(${q.pretty()})`
    const started = this.logStarted(op, q.table)
    let { rows, ...queryResult } = await this.cfg.db.runQuery<DBM>(q, opt)
    if (this.cfg.hooks!.afterLoad && rows.length) {
      rows = (await pMap(rows, async dbm => await this.cfg.hooks!.afterLoad!(dbm))).filter(
        _isTruthy,
      )
    }

    const partialQuery = !!q._selectedFieldNames
    const dbms = partialQuery ? rows : this.anyToDBMs(rows, opt)
    this.logResult(started, op, dbms, q.table)
    return { rows: dbms, ...queryResult }
  }

  async runQueryCount(q: DBQuery<DBM>, opt: CommonDaoReadOptions = {}): Promise<number> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    const op = `runQueryCount(${q.pretty()})`
    const started = this.logStarted(op, q.table)
    const count = await this.cfg.db.runQueryCount(q, opt)
    if (this.cfg.logLevel! >= CommonDaoLogLevel.OPERATIONS) {
      this.cfg.logger?.log(`<< ${q.table}.${op}: ${count} row(s) in ${_since(started)}`)
    }
    return count
  }

  async streamQueryForEach(
    q: DBQuery<DBM>,
    mapper: AsyncMapper<BM, void>,
    opt: CommonDaoStreamForEachOptions<BM> = {},
  ): Promise<void> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    opt.skipValidation = opt.skipValidation !== false // default true
    opt.errorMode ||= ErrorMode.SUPPRESS

    const partialQuery = !!q._selectedFieldNames
    const op = `streamQueryForEach(${q.pretty()})`
    const started = this.logStarted(op, q.table, true)
    let count = 0

    await _pipeline([
      this.cfg.db.streamQuery<DBM>(q, opt),
      transformMap<DBM, BM>(
        async dbm => {
          count++
          if (partialQuery) return dbm as any

          if (this.cfg.hooks!.afterLoad) {
            dbm = (await this.cfg.hooks!.afterLoad(dbm))!
            if (dbm === null) return SKIP
          }

          return await this.dbmToBM(dbm, opt)
        },
        {
          errorMode: opt.errorMode,
        },
      ),
      transformMap<BM, void>(mapper, {
        ...opt,
        predicate: _passthroughPredicate, // to be able to logProgress
      }),
      // LogProgress should be AFTER the mapper, to be able to report correct stats
      transformLogProgress({
        metric: q.table,
        ...opt,
      }),
      writableVoid(),
    ])

    if (this.cfg.logLevel! >= CommonDaoLogLevel.OPERATIONS) {
      this.cfg.logger?.log(`<< ${q.table}.${op}: ${count} row(s) in ${_since(started)}`)
    }
  }

  async streamQueryAsDBMForEach(
    q: DBQuery<DBM>,
    mapper: AsyncMapper<DBM, void>,
    opt: CommonDaoStreamForEachOptions<DBM> = {},
  ): Promise<void> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    opt.skipValidation = opt.skipValidation !== false // default true
    opt.errorMode ||= ErrorMode.SUPPRESS

    const partialQuery = !!q._selectedFieldNames
    const op = `streamQueryAsDBMForEach(${q.pretty()})`
    const started = this.logStarted(op, q.table, true)
    let count = 0

    await _pipeline([
      this.cfg.db.streamQuery<any>(q, opt),
      transformMap<any, DBM>(
        async dbm => {
          count++
          if (partialQuery) return dbm

          if (this.cfg.hooks!.afterLoad) {
            dbm = (await this.cfg.hooks!.afterLoad(dbm))!
            if (dbm === null) return SKIP
          }

          return this.anyToDBM(dbm, opt)
        },
        {
          errorMode: opt.errorMode,
        },
      ),
      transformMap<DBM, void>(mapper, {
        ...opt,
        predicate: _passthroughPredicate, // to be able to logProgress
      }),
      // LogProgress should be AFTER the mapper, to be able to report correct stats
      transformLogProgress({
        metric: q.table,
        ...opt,
      }),
      writableVoid(),
    ])

    if (this.cfg.logLevel! >= CommonDaoLogLevel.OPERATIONS) {
      this.cfg.logger?.log(`<< ${q.table}.${op}: ${count} row(s) in ${_since(started)}`)
    }
  }

  /**
   * Stream as Readable, to be able to .pipe() it further with support of backpressure.
   */
  streamQueryAsDBM(q: DBQuery<DBM>, opt: CommonDaoStreamOptions<DBM> = {}): ReadableTyped<DBM> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    opt.skipValidation = opt.skipValidation !== false // default true
    opt.errorMode ||= ErrorMode.SUPPRESS

    const partialQuery = !!q._selectedFieldNames

    const stream = this.cfg.db.streamQuery<DBM>(q, opt)
    if (partialQuery) return stream

    return stream
      .on('error', err => stream.emit('error', err))
      .pipe(
        transformMap<any, DBM>(
          async dbm => {
            if (this.cfg.hooks!.afterLoad) {
              dbm = (await this.cfg.hooks!.afterLoad(dbm))!
              if (dbm === null) return SKIP
            }

            return this.anyToDBM(dbm, opt)
          },
          {
            errorMode: opt.errorMode,
          },
        ),
      )
  }

  /**
   * Stream as Readable, to be able to .pipe() it further with support of backpressure.
   *
   * Please note that this stream is currently not async-iteration friendly, because of
   * `through2` usage.
   * Will be migrated/fixed at some point in the future.
   *
   * You can do `.pipe(transformNoOp)` to make it "valid again".
   */
  streamQuery(q: DBQuery<DBM>, opt: CommonDaoStreamOptions<BM> = {}): ReadableTyped<BM> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    opt.skipValidation = opt.skipValidation !== false // default true
    opt.errorMode ||= ErrorMode.SUPPRESS

    const stream = this.cfg.db.streamQuery<DBM>(q, opt)
    const partialQuery = !!q._selectedFieldNames
    if (partialQuery) return stream as any

    // This almost works, but hard to implement `errorMode: THROW_AGGREGATED` in this case
    // return stream.flatMap(async (dbm: DBM) => {
    //   if (this.cfg.hooks!.afterLoad) {
    //     dbm = (await this.cfg.hooks!.afterLoad(dbm))!
    //     if (dbm === null) return [] // SKIP
    //   }
    //
    //   return [await this.dbmToBM(dbm, opt)] satisfies BM[]
    // }, {
    //   concurrency: 16,
    // })

    return (
      stream
        // optimization: 1 validation is enough
        // .pipe(transformMap<any, DBM>(dbm => this.anyToDBM(dbm, opt), safeOpt))
        // .pipe(transformMap<DBM, BM>(dbm => this.dbmToBM(dbm, opt), safeOpt))
        .on('error', err => stream.emit('error', err))
        .pipe(
          transformMap<DBM, BM>(
            async dbm => {
              if (this.cfg.hooks!.afterLoad) {
                dbm = (await this.cfg.hooks!.afterLoad(dbm))!
                if (dbm === null) return SKIP
              }

              return await this.dbmToBM(dbm, opt)
            },
            {
              errorMode: opt.errorMode,
            },
          ),
        )
        // this can make the stream async-iteration-friendly
        // but not applying it now for perf reasons
        // UPD: applying, to be compliant with `.toArray()`, etc.
        .on('error', err => stream.emit('error', err))
        .pipe(transformNoOp())
    )
  }

  async queryIds(q: DBQuery<DBM>, opt: CommonDaoReadOptions = {}): Promise<ID[]> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    const { rows } = await this.cfg.db.runQuery(q.select(['id']), opt)
    return rows.map(r => r.id as ID)
  }

  streamQueryIds(q: DBQuery<DBM>, opt: CommonDaoStreamOptions<ID> = {}): ReadableTyped<ID> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    opt.errorMode ||= ErrorMode.SUPPRESS

    // Experimental: using `.map()`
    const stream: ReadableTyped<ID> = this.cfg.db
      .streamQuery<DBM>(q.select(['id']), opt)
      // .on('error', err => stream.emit('error', err))
      .map((r: ObjectWithId) => r.id as ID)

    // const stream: ReadableTyped<string> = this.cfg.db
    //   .streamQuery<DBM>(q.select(['id']), opt)
    //   .on('error', err => stream.emit('error', err))
    //   .pipe(
    //     transformMapSimple<DBM, string>(r => r.id, {
    //       errorMode: ErrorMode.SUPPRESS, // cause .pipe() cannot propagate errors
    //     }),
    //   )

    return stream
  }

  async streamQueryIdsForEach(
    q: DBQuery<DBM>,
    mapper: AsyncMapper<ID, void>,
    opt: CommonDaoStreamForEachOptions<ID> = {},
  ): Promise<void> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    opt.errorMode ||= ErrorMode.SUPPRESS

    const op = `streamQueryIdsForEach(${q.pretty()})`
    const started = this.logStarted(op, q.table, true)
    let count = 0

    await _pipeline([
      this.cfg.db.streamQuery<DBM>(q.select(['id']), opt).map(r => {
        count++
        return r.id
      }),
      transformMap<ID, void>(mapper, {
        ...opt,
        predicate: _passthroughPredicate,
      }),
      // LogProgress should be AFTER the mapper, to be able to report correct stats
      transformLogProgress({
        metric: q.table,
        ...opt,
      }),
      writableVoid(),
    ])

    if (this.cfg.logLevel! >= CommonDaoLogLevel.OPERATIONS) {
      this.cfg.logger?.log(`<< ${q.table}.${op}: ${count} id(s) in ${_since(started)}`)
    }
  }

  /**
   * Mutates!
   * "Returns", just to have a type of "Saved"
   */
  assignIdCreatedUpdated<T extends BaseDBEntity>(obj: Partial<T>, opt: CommonDaoOptions = {}): T {
    const now = localTime.nowUnix()

    if (this.cfg.useCreatedProperty) {
      obj.created ||= obj.updated || now
    }

    if (this.cfg.useUpdatedProperty) {
      obj.updated = opt.preserveUpdatedCreated && obj.updated ? obj.updated : now
    }

    if (this.cfg.generateId) {
      obj.id ||= (this.cfg.hooks!.createNaturalId?.(obj as any) ||
        this.cfg.hooks!.createRandomId!()) as T['id']
    }

    return obj as T
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
      const convertedBM = this.validateAndConvert(bm as Partial<BM>, this.cfg.bmSchema, 'save', opt)
      if (_deepJsonEquals(convertedBM, opt.skipIfEquals)) {
        // Skipping the save operation
        return bm as BM
      }
    }

    const idWasGenerated = !bm.id && this.cfg.generateId
    this.assignIdCreatedUpdated(bm, opt) // mutates
    _typeCast<BM>(bm)
    let dbm = await this.bmToDBM(bm, opt) // validates BM

    if (this.cfg.hooks!.beforeSave) {
      dbm = (await this.cfg.hooks!.beforeSave(dbm))!
      if (dbm === null) return bm
    }

    const table = opt.table || this.cfg.table
    if (opt.ensureUniqueId && idWasGenerated) await this.ensureUniqueId(table, dbm)
    if (this.cfg.immutable && !opt.allowMutability && !opt.saveMethod) {
      opt = { ...opt, saveMethod: 'insert' }
    }
    const op = `save(${dbm.id})`
    const started = this.logSaveStarted(op, bm, table)
    const { excludeFromIndexes } = this.cfg
    const assignGeneratedIds = opt.assignGeneratedIds || this.cfg.assignGeneratedIds

    await (opt.tx || this.cfg.db).saveBatch(table, [dbm], {
      excludeFromIndexes,
      assignGeneratedIds,
      ...opt,
    })

    if (assignGeneratedIds) {
      bm.id = dbm.id
    }

    this.logSaveResult(started, op, table)
    return bm
  }

  async saveAsDBM(dbm: Unsaved<DBM>, opt: CommonDaoSaveOptions<BM, DBM> = {}): Promise<DBM> {
    this.requireWriteAccess()
    const table = opt.table || this.cfg.table

    // assigning id in case it misses the id
    // will override/set `updated` field, unless opts.preserveUpdated is set
    const idWasGenerated = !dbm.id && this.cfg.generateId
    this.assignIdCreatedUpdated(dbm, opt) // mutates
    let row = this.anyToDBM(dbm, opt)
    if (opt.ensureUniqueId && idWasGenerated) await this.ensureUniqueId(table, row)

    if (this.cfg.immutable && !opt.allowMutability && !opt.saveMethod) {
      opt = { ...opt, saveMethod: 'insert' }
    }
    const op = `saveAsDBM(${row.id})`
    const started = this.logSaveStarted(op, row, table)
    const { excludeFromIndexes } = this.cfg
    const assignGeneratedIds = opt.assignGeneratedIds || this.cfg.assignGeneratedIds

    if (this.cfg.hooks!.beforeSave) {
      row = (await this.cfg.hooks!.beforeSave(row))!
      if (row === null) return dbm as DBM
    }

    await (opt.tx || this.cfg.db).saveBatch(table, [row], {
      excludeFromIndexes,
      assignGeneratedIds,
      ...opt,
    })

    if (assignGeneratedIds) {
      dbm.id = row.id
    }

    this.logSaveResult(started, op, table)
    return row
  }

  async saveBatch(bms: Unsaved<BM>[], opt: CommonDaoSaveBatchOptions<DBM> = {}): Promise<BM[]> {
    if (!bms.length) return []
    this.requireWriteAccess()
    const table = opt.table || this.cfg.table
    bms.forEach(bm => this.assignIdCreatedUpdated(bm, opt))
    let dbms = await this.bmsToDBM(bms as BM[], opt)

    if (this.cfg.hooks!.beforeSave && dbms.length) {
      dbms = (await pMap(dbms, async dbm => await this.cfg.hooks!.beforeSave!(dbm))).filter(
        _isTruthy,
      )
    }

    if (opt.ensureUniqueId) throw new AppError('ensureUniqueId is not supported in saveBatch')
    if (this.cfg.immutable && !opt.allowMutability && !opt.saveMethod) {
      opt = { ...opt, saveMethod: 'insert' }
    }

    const op = `saveBatch ${dbms.length} row(s) (${_truncate(
      dbms
        .slice(0, 10)
        .map(bm => bm.id)
        .join(', '),
      50,
    )})`
    const started = this.logSaveStarted(op, bms, table)
    const { excludeFromIndexes } = this.cfg
    const assignGeneratedIds = opt.assignGeneratedIds || this.cfg.assignGeneratedIds

    await (opt.tx || this.cfg.db).saveBatch(table, dbms, {
      excludeFromIndexes,
      assignGeneratedIds,
      ...opt,
    })

    if (assignGeneratedIds) {
      dbms.forEach((dbm, i) => (bms[i]!.id = dbm.id))
    }

    this.logSaveResult(started, op, table)

    return bms as BM[]
  }

  async saveBatchAsDBM(
    dbms: Unsaved<DBM>[],
    opt: CommonDaoSaveBatchOptions<DBM> = {},
  ): Promise<DBM[]> {
    if (!dbms.length) return []
    this.requireWriteAccess()
    const table = opt.table || this.cfg.table
    dbms.forEach(dbm => this.assignIdCreatedUpdated(dbm, opt)) // mutates
    let rows = this.anyToDBMs(dbms as DBM[], opt)
    if (opt.ensureUniqueId) throw new AppError('ensureUniqueId is not supported in saveBatch')

    if (this.cfg.immutable && !opt.allowMutability && !opt.saveMethod) {
      opt = { ...opt, saveMethod: 'insert' }
    }
    const op = `saveBatchAsDBM ${rows.length} row(s) (${_truncate(
      rows
        .slice(0, 10)
        .map(bm => bm.id)
        .join(', '),
      50,
    )})`
    const started = this.logSaveStarted(op, rows, table)
    const { excludeFromIndexes } = this.cfg
    const assignGeneratedIds = opt.assignGeneratedIds || this.cfg.assignGeneratedIds

    if (this.cfg.hooks!.beforeSave && rows.length) {
      rows = (await pMap(rows, async row => await this.cfg.hooks!.beforeSave!(row))).filter(
        _isTruthy,
      )
    }

    await (opt.tx || this.cfg.db).saveBatch(table, rows, {
      excludeFromIndexes,
      assignGeneratedIds,
      ...opt,
    })

    if (assignGeneratedIds) {
      rows.forEach((row, i) => (dbms[i]!.id = row.id))
    }

    this.logSaveResult(started, op, table)
    return rows
  }

  /**
   * "Streaming" is implemented by buffering incoming rows into **batches**
   * (of size opt.chunkSize, which defaults to 500),
   * and then executing db.saveBatch(chunk) with the concurrency
   * of opt.chunkConcurrency (which defaults to 32).
   */
  streamSaveTransform(opt: CommonDaoStreamSaveOptions<DBM> = {}): Transform[] {
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

    return [
      transformMap<BM, DBM>(
        async bm => {
          this.assignIdCreatedUpdated(bm, opt) // mutates

          let dbm = await this.bmToDBM(bm, opt)

          if (beforeSave) {
            dbm = (await beforeSave(dbm))!
            if (dbm === null) return SKIP
          }

          return dbm
        },
        {
          errorMode,
        },
      ),
      transformChunk<DBM>({ chunkSize }),
      transformMap<DBM[], DBM[]>(
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
          flattenArrayOutput: true,
        },
      ),
      transformLogProgress({
        metric: 'saved',
        ...opt,
      }),
      // just to satisfy and simplify typings
      // It's easier to return Transform[], rather than (Transform | Writable)[]
      writableVoid() as Transform,
    ]
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
    const op = `deleteByIds(${ids.join(', ')})`
    const table = opt.table || this.cfg.table
    const started = this.logStarted(op, table)
    const count = await (opt.tx || this.cfg.db).deleteByIds(table, ids as string[], opt)
    this.logSaveResult(started, op, table)
    return count
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
    const op = `deleteByQuery(${q.pretty()})`
    const started = this.logStarted(op, q.table)
    let deleted = 0

    if (opt.chunkSize) {
      const { chunkSize, chunkConcurrency = 8 } = opt

      await _pipeline([
        this.cfg.db.streamQuery<DBM>(q.select(['id']), opt).map(r => r.id),
        transformChunk<string>({ chunkSize }),
        transformMap<string[], void>(
          async ids => {
            await this.cfg.db.deleteByIds(q.table, ids, opt)
            deleted += ids.length
          },
          {
            predicate: _passthroughPredicate,
            concurrency: chunkConcurrency,
            errorMode: opt.errorMode || ErrorMode.THROW_IMMEDIATELY,
          },
        ),
        // LogProgress should be AFTER the mapper, to be able to report correct stats
        transformLogProgress({
          metric: q.table,
          logEvery: 2, // 500 * 2 === 1000
          chunkSize,
          ...opt,
        }),
        writableVoid(),
      ])
    } else {
      deleted = await this.cfg.db.deleteByQuery(q, opt)
    }

    this.logSaveResult(started, op, q.table)
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
    const op = `patchByQuery(${q.pretty()})`
    const started = this.logStarted(op, q.table)
    const updated = await this.cfg.db.patchByQuery(q, patch, opt)
    this.logSaveResult(started, op, q.table)
    return updated
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
    const op = `increment`
    const started = this.logStarted(op, table)
    const result = await this.cfg.db.incrementBatch(table, prop as string, {
      [id as string]: by,
    })
    this.logSaveResult(started, op, table)
    return result[id as string]!
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
    const op = `incrementBatch`
    const started = this.logStarted(op, table)
    const result = await this.cfg.db.incrementBatch(table, prop as string, incrementMap)
    this.logSaveResult(started, op, table)
    return result
  }

  // CONVERSIONS

  async dbmToBM(_dbm: undefined, opt?: CommonDaoOptions): Promise<undefined>
  async dbmToBM(_dbm?: DBM, opt?: CommonDaoOptions): Promise<BM>
  async dbmToBM(_dbm?: DBM, opt: CommonDaoOptions = {}): Promise<BM | undefined> {
    if (!_dbm) return

    // optimization: no need to run full joi DBM validation, cause BM validation will be run
    // const dbm = this.anyToDBM(_dbm, opt)
    let dbm: DBM = { ..._dbm, ...this.cfg.hooks!.parseNaturalId!(_dbm.id as ID) }

    if (opt.anonymize) {
      dbm = this.cfg.hooks!.anonymize!(dbm)
    }

    // DBM > BM
    const bm = ((await this.cfg.hooks!.beforeDBMToBM?.(dbm)) || dbm) as Partial<BM>

    // Validate/convert BM
    return this.validateAndConvert(bm, this.cfg.bmSchema, 'load', opt)
  }

  async dbmsToBM(dbms: DBM[], opt: CommonDaoOptions = {}): Promise<BM[]> {
    return await pMap(dbms, async dbm => await this.dbmToBM(dbm, opt))
  }

  /**
   * Mutates object with properties: id, created, updated.
   * Returns DBM (new reference).
   */
  async bmToDBM(bm: undefined, opt?: CommonDaoOptions): Promise<undefined>
  async bmToDBM(bm?: BM, opt?: CommonDaoOptions): Promise<DBM>
  async bmToDBM(bm?: BM, opt?: CommonDaoOptions): Promise<DBM | undefined> {
    if (bm === undefined) return

    // bm gets assigned to the new reference
    bm = this.validateAndConvert(bm, this.cfg.bmSchema, 'save', opt)

    // BM > DBM
    return ((await this.cfg.hooks!.beforeBMToDBM?.(bm!)) || bm) as DBM
  }

  async bmsToDBM(bms: BM[], opt: CommonDaoOptions = {}): Promise<DBM[]> {
    // try/catch?
    return await pMap(bms, async bm => await this.bmToDBM(bm, opt))
  }

  anyToDBM(dbm: undefined, opt?: CommonDaoOptions): undefined
  anyToDBM(dbm?: any, opt?: CommonDaoOptions): DBM
  anyToDBM(dbm?: DBM, opt: CommonDaoOptions = {}): DBM | undefined {
    if (!dbm) return

    // this shouldn't be happening on load! but should on save!
    // this.assignIdCreatedUpdated(dbm, opt)

    dbm = { ...dbm, ...this.cfg.hooks!.parseNaturalId!(dbm.id as ID) }

    // todo: is this the right place?
    // todo: is anyToDBM even needed?
    if (opt.anonymize) {
      dbm = this.cfg.hooks!.anonymize!(dbm)
    }

    // Validate/convert DBM
    // return this.validateAndConvert(dbm, this.cfg.dbmSchema, DBModelType.DBM, opt)
    return dbm
  }

  anyToDBMs(entities: DBM[], opt: CommonDaoOptions = {}): DBM[] {
    return entities.map(entity => this.anyToDBM(entity, opt))
  }

  /**
   * Returns *converted value* (NOT the same reference).
   * Does NOT mutate the object.
   * Validates (unless `skipValidation=true` passed).
   */
  validateAndConvert<T>(
    obj: Partial<T>,
    schema: ObjectSchema<T> | AjvSchema<T> | ZodType<T> | undefined,
    op?: 'load' | 'save', // this is to skip validation if validateOnLoad/Save is false
    opt: CommonDaoOptions = {},
  ): any {
    // Kirill 2021-10-18: I realized that there's little reason to keep removing null values
    // So, from now on we'll preserve them
    // "undefined" values, I believe, are/were not saved to/from DB anyway (due to e.g JSON.stringify removing them)
    // But let's keep watching it!
    //
    // Filter null and undefined values
    // obj = _filterNullishValues(obj as any)
    // We still filter `undefined` values here, because `beforeDBMToBM` can return undefined values
    // and they can be annoying with snapshot tests
    obj = _filterUndefinedValues(obj)

    // Return as is if no schema is passed or if `skipConversion` is set
    if (
      !schema ||
      opt.skipValidation ||
      (op === 'load' && !this.cfg.validateOnLoad) ||
      (op === 'save' && !this.cfg.validateOnSave)
    ) {
      return obj
    }

    // This will Convert and Validate
    const table = opt.table || this.cfg.table
    const objectName = table

    let error: JoiValidationError | AjvValidationError | ZodValidationError | undefined
    let convertedValue: any

    if (schema instanceof ZodType) {
      // Zod schema
      const vr = zSafeValidate(obj as T, schema)
      error = vr.error
      convertedValue = vr.data
    } else if (schema instanceof AjvSchema) {
      // Ajv schema
      convertedValue = obj // because Ajv mutates original object

      error = schema.getValidationError(obj as T, {
        objectName,
      })
    } else {
      // Joi
      const start = localTime.nowUnixMillis()
      const vr = getValidationResult(obj, schema, objectName)
      const tookMillis = localTime.nowUnixMillis() - start

      this.cfg.onValidationTime?.({
        tookMillis,
        table,
        obj,
      })

      error = vr.error
      convertedValue = vr.value
    }

    // If we care about validation and there's an error
    if (error) {
      const processedError = this.cfg.hooks!.onValidationError!(error)

      if (processedError) throw processedError
    }

    return convertedValue
  }

  async getTableSchema(): Promise<JsonSchemaRootObject<DBM>> {
    return await this.cfg.db.getTableSchema<DBM>(this.cfg.table)
  }

  async createTable(schema: JsonSchemaObject<DBM>, opt?: CommonDaoCreateOptions): Promise<void> {
    this.requireWriteAccess()
    await this.cfg.db.createTable(this.cfg.table, schema, opt)
  }

  /**
   * Proxy to this.cfg.db.ping
   */
  async ping(): Promise<void> {
    await this.cfg.db.ping()
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

  /**
   * Throws if query uses a property that is in `excludeFromIndexes` list.
   */
  private validateQueryIndexes(q: DBQuery<DBM>): void {
    const { excludeFromIndexes } = this.cfg
    if (!excludeFromIndexes) return

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

  protected logResult(started: UnixTimestampMillis, op: string, res: any, table: string): void {
    if (!this.cfg.logLevel) return

    let logRes: any
    const args: any[] = []

    if (Array.isArray(res)) {
      logRes = `${res.length} row(s)`
      if (res.length && this.cfg.logLevel >= CommonDaoLogLevel.DATA_FULL) {
        args.push('\n', ...res.slice(0, 10)) // max 10 items
      }
    } else if (res) {
      logRes = `1 row`
      if (this.cfg.logLevel >= CommonDaoLogLevel.DATA_SINGLE) {
        args.push('\n', res)
      }
    } else {
      logRes = `undefined`
    }

    this.cfg.logger?.log(`<< ${table}.${op}: ${logRes} in ${_since(started)}`, ...args)
  }

  protected logSaveResult(started: UnixTimestampMillis, op: string, table: string): void {
    if (!this.cfg.logLevel) return
    this.cfg.logger?.log(`<< ${table}.${op} in ${_since(started)}`)
  }

  protected logStarted(op: string, table: string, force = false): UnixTimestampMillis {
    if (this.cfg.logStarted || force) {
      this.cfg.logger?.log(`>> ${table}.${op}`)
    }
    return localTime.nowUnixMillis()
  }

  protected logSaveStarted(op: string, items: any, table: string): UnixTimestampMillis {
    if (this.cfg.logStarted) {
      const args: any[] = [`>> ${table}.${op}`]
      if (Array.isArray(items)) {
        if (items.length && this.cfg.logLevel! >= CommonDaoLogLevel.DATA_FULL) {
          args.push('\n', ...items.slice(0, 10))
        } else {
          args.push(`${items.length} row(s)`)
        }
      } else {
        if (this.cfg.logLevel! >= CommonDaoLogLevel.DATA_SINGLE) {
          args.push(items)
        }
      }

      this.cfg.logger?.log(...args)
    }

    return localTime.nowUnixMillis()
  }
}

/**
 * Transaction is committed when the function returns resolved Promise (aka "returns normally").
 *
 * Transaction is rolled back when the function returns rejected Promise (aka "throws").
 */
export type CommonDaoTransactionFn<T = void> = (tx: CommonDaoTransaction) => Promise<T>

/**
 * Transaction context.
 * Has similar API than CommonDao, but all operations are performed in the context of the transaction.
 */
export class CommonDaoTransaction {
  constructor(
    public tx: DBTransaction,
    private logger: CommonLogger,
  ) {}

  /**
   * Commits the underlying DBTransaction.
   * May throw.
   */
  async commit(): Promise<void> {
    await this.tx.commit()
  }

  /**
   * Perform a graceful rollback without throwing/re-throwing any error.
   * Never throws.
   */
  async rollback(): Promise<void> {
    try {
      await this.tx.rollback()
    } catch (err) {
      // graceful rollback without re-throw
      this.logger.error(err)
    }
  }

  async getById<BM extends BaseDBEntity, DBM extends BaseDBEntity, ID = BM['id']>(
    dao: CommonDao<BM, DBM, ID>,
    id?: ID | null,
    opt?: CommonDaoReadOptions,
  ): Promise<BM | null> {
    return await dao.getById(id, { ...opt, tx: this.tx })
  }

  async getByIds<BM extends BaseDBEntity, DBM extends BaseDBEntity, ID = BM['id']>(
    dao: CommonDao<BM, DBM, ID>,
    ids: ID[],
    opt?: CommonDaoReadOptions,
  ): Promise<BM[]> {
    return await dao.getByIds(ids, { ...opt, tx: this.tx })
  }

  // todo: Queries inside Transaction are not supported yet
  // async runQuery<BM extends PartialObjectWithId, DBM extends ObjectWithId>(
  //   dao: CommonDao<BM, DBM, any>,
  //   q: DBQuery<DBM>,
  //   opt?: CommonDaoOptions,
  // ): Promise<BM[]> {
  //   try {
  //     return await dao.runQuery(q, { ...opt, tx: this.tx })
  //   } catch (err) {
  //     await this.rollback()
  //     throw err
  //   }
  // }

  async save<BM extends BaseDBEntity, DBM extends BaseDBEntity>(
    dao: CommonDao<BM, DBM>,
    bm: Unsaved<BM>,
    opt?: CommonDaoSaveOptions<BM, DBM>,
  ): Promise<BM> {
    return await dao.save(bm, { ...opt, tx: this.tx })
  }

  async saveBatch<BM extends BaseDBEntity, DBM extends BaseDBEntity>(
    dao: CommonDao<BM, DBM>,
    bms: Unsaved<BM>[],
    opt?: CommonDaoSaveBatchOptions<DBM>,
  ): Promise<BM[]> {
    return await dao.saveBatch(bms, { ...opt, tx: this.tx })
  }

  /**
   * DaoTransaction.patch does not load from DB.
   * It assumes the bm was previously loaded in the same Transaction, hence could not be
   * concurrently modified. Hence it's safe to not sync with DB.
   *
   * So, this method is a rather simple convenience "Object.assign and then save".
   */
  async patch<BM extends BaseDBEntity, DBM extends BaseDBEntity, ID = BM['id']>(
    dao: CommonDao<BM, DBM, ID>,
    bm: BM,
    patch: Partial<BM>,
    opt?: CommonDaoSaveOptions<BM, DBM>,
  ): Promise<BM> {
    const skipIfEquals = _deepCopy(bm)
    Object.assign(bm, patch)
    return await dao.save(bm, { ...opt, skipIfEquals, tx: this.tx })
  }

  async deleteById<BM extends BaseDBEntity, DBM extends BaseDBEntity, ID = BM['id']>(
    dao: CommonDao<BM, DBM, ID>,
    id?: ID | null,
    opt?: CommonDaoOptions,
  ): Promise<number> {
    if (!id) return 0
    return await this.deleteByIds(dao, [id], opt)
  }

  async deleteByIds<BM extends BaseDBEntity, DBM extends BaseDBEntity, ID = BM['id']>(
    dao: CommonDao<BM, DBM, ID>,
    ids: ID[],
    opt?: CommonDaoOptions,
  ): Promise<number> {
    return await dao.deleteByIds(ids, { ...opt, tx: this.tx })
  }
}
