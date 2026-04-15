import { _isTruthy } from '@naturalcycles/js-lib'
import { _chunk, _uniqBy } from '@naturalcycles/js-lib/array/array.util.js'
import { _sortBy } from '@naturalcycles/js-lib/array/sort.js'
import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { _assert, ErrorMode } from '@naturalcycles/js-lib/error'
import { _deepJsonEquals } from '@naturalcycles/js-lib/object/deepEquals.js'
import {
  _filterUndefinedValues,
  _objectAssignExact,
  _omitWithUndefined,
  _pick,
} from '@naturalcycles/js-lib/object/object.util.js'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import type {
  BaseDBEntity,
  NonNegativeInteger,
  ObjectWithId,
  StringMap,
  Unsaved,
} from '@naturalcycles/js-lib/types'
import {
  _objectKeys,
  _passthroughPredicate,
  _stringMapEntries,
  _stringMapValues,
  _typeCast,
} from '@naturalcycles/js-lib/types'
import { stringId } from '@naturalcycles/nodejs-lib'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import type { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import { zip2 } from '@naturalcycles/nodejs-lib/zip'
import { DBLibError } from '../cnst.js'
import { CommonDBType } from '../commondb/common.db.js'
import type {
  CommonDBSaveOptions,
  CommonDBTransactionOptions,
  RunQueryResult,
} from '../db.model.js'
import { DBQuery, RunnableDBQuery } from '../query/dbQuery.js'
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
 * Reserved properties on the PRIMARY row used by auto-compression and auto-chunking.
 * Excluded from indexes automatically when `compress` is configured.
 *
 * Note: chunks live in a dedicated table (`${table}__chunks`), so no `__chunked` marker is needed.
 */
const PRIMARY_RESERVED_KEYS = ['__compressed', '__chunks'] as const

/**
 * For chunk rows: only `__compressed` (the Buffer) is excluded from indexes.
 * `primaryId` and `chunkIdx` ARE indexed — `primaryId` is used for parallel fetches via
 * `filterIn('primaryId', [...])`.
 */
const CHUNK_RESERVED_KEYS = ['__compressed'] as const

/**
 * Default threshold (in bytes) at which the `__compressed` Buffer is split into chunk rows.
 * Leaves ~100 KB headroom under Datastore's 1 MB per-entity cap for non-compressed fields + metadata.
 */
const DEFAULT_MAX_CHUNK_SIZE = 900_000

/**
 * Hard cap on the number of chunk rows a single entity may occupy.
 * A 100-chunk entity is already ~90 MB compressed — using Datastore for that scale is a misuse.
 */
const MAX_CHUNKS_PER_ENTITY = 100

/**
 * Datastore `IN`-filter value limit (historically 30 in Datastore; larger in Firestore Datastore
 * mode). We batch primary-id lists at this size for chunks-table queries.
 */
const FILTER_IN_BATCH_SIZE = 30

/**
 * Maximum ids per single `deleteByIds` API call (Datastore mutation-per-commit limit).
 */
const DELETE_BY_IDS_BATCH_SIZE = 500

/**
 * Lowest common denominator API between supported Databases.
 *
 * BM = Backend model (optimized for API access)
 * DBM = Database model (logical representation, before compression)
 * TM = Transport model (optimized to be sent over the wire)
 *
 * Note: When auto-compression is enabled, the physical storage format differs from DBM.
 * Compression/decompression is handled transparently at the storage boundary.
 * When auto-chunking is additionally enabled, large compressed payloads are split across
 * multiple storage rows (primary at `id`, extra chunks at `${id}__c${n}`); reassembly is transparent.
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

    // If the auto-compression is enabled,
    // then we need to ensure that the '__compressed' (and chunking) properties are part of the
    // index exclusion list.
    if (this.cfg.compress?.keys) {
      // Auto-compression stores a Buffer in a dedicated `__compressed` property and relies on
      // `excludeFromIndexes`, both of which are Datastore-specific. Using it with a relational DB
      // (e.g. MySQL) would require an explicit column/schema and would silently ignore
      // `excludeFromIndexes` — so we block it at construction time.
      _assert(
        this.cfg.db.dbType === CommonDBType.document,
        `CommonDao "${this.cfg.table}": compress feature is only supported on document DBs (e.g. Datastore), got dbType=${this.cfg.db.dbType}`,
      )

      // Chunking piggybacks on compression — it only splits the `__compressed` Buffer.
      if (this.cfg.compress.chunk) {
        _assert(
          this.cfg.compress.keys.length > 0,
          `CommonDao "${this.cfg.table}": compress.chunk requires compress.keys to be non-empty`,
        )
      }

      const current = this.cfg.excludeFromIndexes
      this.cfg.excludeFromIndexes = current ? [...current] : []
      for (const key of PRIMARY_RESERVED_KEYS) {
        if (!this.cfg.excludeFromIndexes.includes(key as any)) {
          this.cfg.excludeFromIndexes.push(key as any)
        }
      }
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
    return this.dbmToBM(dbm, opt)
  }

  async getByIdAsDBM(id?: ID | null, opt: CommonDaoReadOptions = {}): Promise<DBM | null> {
    if (!id) return null
    const [row] = await this.loadByIds([id], opt)
    return this.anyToDBM(row, opt)
  }

  async getByIds(ids: ID[], opt: CommonDaoReadOptions = {}): Promise<BM[]> {
    const dbms = await this.loadByIds(ids, opt)
    return this.dbmsToBM(dbms, opt)
  }

  async getByIdsAsDBM(ids: ID[], opt: CommonDaoReadOptions = {}): Promise<DBM[]> {
    const rows = await this.loadByIds(ids, opt)
    return this.anyToDBMs(rows)
  }

  // DRY private method
  private async loadByIds(ids: ID[], opt: CommonDaoReadOptions = {}): Promise<DBM[]> {
    if (!ids.length) return []
    const table = opt.table || this.cfg.table
    const dbOrTx = opt.tx || this.cfg.db

    // Speculative parallel fetch: primaries + chunks in one round-trip. `fetchChunksByPrimaryIds`
    // returns [] when compression isn't configured, so Promise.all stays branch-free.
    // Cfg-independent dechunking: works even after `compress.chunk` is turned off
    // (reassembly is driven by primary's `__chunks` metadata).
    const [primaries, chunkRows] = await Promise.all([
      dbOrTx.getByIds<DBM>(table, ids, opt),
      this.fetchChunksByPrimaryIds(table, ids, opt),
    ])

    this.reassembleChunks(primaries, chunkRows)
    return this.storageRowsToDBM(primaries)
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
    const { rows: primaries, ...queryResult } = await this.cfg.db.runQuery<DBM>(q, opt)
    const isPartialQuery = !!q._selectedFieldNames

    // Full queries only: fetch chunks for any chunked primaries and reassemble (cfg-independent,
    // driven by __chunks metadata on returned primaries).
    if (!isPartialQuery) {
      await this.fetchAndReassembleChunks(q.table, primaries, opt)
    }
    const rows = isPartialQuery ? primaries : this.storageRowsToDBM(primaries)
    const bms = isPartialQuery ? (rows as any[]) : this.dbmsToBM(rows, opt)
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
    const { rows: primaries, ...queryResult } = await this.cfg.db.runQuery<DBM>(q, opt)
    const isPartialQuery = !!q._selectedFieldNames
    if (!isPartialQuery) {
      await this.fetchAndReassembleChunks(q.table, primaries, opt)
    }
    const rows = isPartialQuery ? primaries : this.storageRowsToDBM(primaries)
    const dbms = isPartialQuery ? rows : this.anyToDBMs(rows, opt)
    return { rows: dbms, ...queryResult }
  }

  /**
   * For a batch of primaries, fetch their chunks (one `filterIn('primaryId', ids)` query) and
   * reassemble in place. Cfg-independent — gated on the presence of `__chunks` metadata.
   */
  private async fetchAndReassembleChunks(
    table: string,
    primaries: any[],
    opt: CommonDaoReadOptions,
  ): Promise<void> {
    const chunkedIds: string[] = []
    for (const p of primaries) {
      if (typeof p.__chunks === 'number' && p.__chunks > 1) chunkedIds.push(p.id)
    }
    const chunkRows = await this.fetchChunksByPrimaryIds(table, chunkedIds, opt)
    this.reassembleChunks(primaries, chunkRows)
  }

  async runQueryCount(q: DBQuery<DBM>, opt: CommonDaoReadOptions = {}): Promise<number> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    return await this.cfg.db.runQueryCount(q, opt)
  }

  streamQueryAsDBM(q: DBQuery<DBM>, opt: CommonDaoStreamOptions<DBM> = {}): Pipeline<DBM> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    let pipeline = this.cfg.db.streamQuery<DBM>(q, opt)

    // Primaries only — chunks live in a separate table. If compression is configured, we may
    // need to dechunk (cfg-independent, driven by each primary's __chunks metadata).
    if (this.cfg.compress?.keys?.length) {
      pipeline = pipeline.map(async row => {
        _typeCast<Compressed<DBM>>(row)
        const n = row.__chunks
        if (typeof n === 'number' && n > 1) {
          await this.fetchAndReassembleChunks(q.table, [row], opt)
        }
        return this.storageRowToDBM(row)
      })
    }

    const isPartialQuery = !!q._selectedFieldNames
    if (isPartialQuery) return pipeline

    opt.skipValidation ??= true
    opt.errorMode ||= ErrorMode.SUPPRESS

    return pipeline.mapSync(dbm => this.anyToDBM(dbm, opt), { errorMode: opt.errorMode })
  }

  streamQuery(q: DBQuery<DBM>, opt: CommonDaoStreamOptions<BM> = {}): Pipeline<BM> {
    this.validateQueryIndexes(q) // throws if query uses `excludeFromIndexes` property
    q.table = opt.table || q.table
    let pipeline = this.cfg.db.streamQuery<DBM>(q, opt)

    if (this.cfg.compress?.keys?.length) {
      pipeline = pipeline.map(async row => {
        _typeCast<Compressed<DBM>>(row)
        const n = row.__chunks
        if (typeof n === 'number' && n > 1) {
          await this.fetchAndReassembleChunks(q.table, [row], opt)
        }
        return this.storageRowToDBM(row)
      })
    }

    const isPartialQuery = !!q._selectedFieldNames
    if (isPartialQuery) return pipeline as any as Pipeline<BM>

    opt.skipValidation ??= true
    opt.errorMode ||= ErrorMode.SUPPRESS

    return pipeline.mapSync(dbm => this.dbmToBM(dbm, opt), { errorMode: opt.errorMode })
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
    const dbm = this.bmToDBM(bm, opt) // validates BM
    this.cfg.hooks!.beforeSave?.(dbm)
    const table = opt.table || this.cfg.table
    const saveOptions = this.prepareSaveOptions(opt)

    const { primary, chunks } = await this.dbmToPrimaryAndChunks(dbm)
    await this.savePrimaryAndChunks(table, [primary], chunks, saveOptions, opt)

    if (saveOptions.assignGeneratedIds) {
      bm.id = dbm.id
    }

    return bm
  }

  async saveAsDBM(dbm: Unsaved<DBM>, opt: CommonDaoSaveOptions<BM, DBM> = {}): Promise<DBM> {
    this.requireWriteAccess()
    this.assignIdCreatedUpdated(dbm, opt) // mutates
    const validDbm = this.anyToDBM(dbm, opt)
    this.cfg.hooks!.beforeSave?.(validDbm)
    const table = opt.table || this.cfg.table
    const saveOptions = this.prepareSaveOptions(opt)

    const { primary, chunks } = await this.dbmToPrimaryAndChunks(validDbm)
    await this.savePrimaryAndChunks(table, [primary], chunks, saveOptions, opt)

    if (saveOptions.assignGeneratedIds) {
      dbm.id = validDbm.id
    }

    return validDbm
  }

  async saveBatch(bms: Unsaved<BM>[], opt: CommonDaoSaveBatchOptions<DBM> = {}): Promise<BM[]> {
    if (!bms.length) return []
    this.requireWriteAccess()
    bms.forEach(bm => this.assignIdCreatedUpdated(bm, opt))
    const dbms = this.bmsToDBM(bms as BM[], opt)
    if (this.cfg.hooks!.beforeSave) {
      dbms.forEach(dbm => this.cfg.hooks!.beforeSave!(dbm))
    }
    const table = opt.table || this.cfg.table
    const saveOptions = this.prepareSaveOptions(opt)

    const primaries: ObjectWithId[] = []
    const allChunks: ChunkRow[] = []
    await pMap(dbms, async (dbm, i) => {
      const { primary, chunks } = await this.dbmToPrimaryAndChunks(dbm)
      primaries[i] = primary
      if (chunks.length) allChunks.push(...chunks)
    })
    await this.savePrimaryAndChunks(table, primaries, allChunks, saveOptions, opt)

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
    const validDbms = this.anyToDBMs(dbms as DBM[], opt)
    if (this.cfg.hooks!.beforeSave) {
      validDbms.forEach(dbm => this.cfg.hooks!.beforeSave!(dbm))
    }
    const table = opt.table || this.cfg.table
    const saveOptions = this.prepareSaveOptions(opt)

    const primaries: ObjectWithId[] = []
    const allChunks: ChunkRow[] = []
    await pMap(validDbms, async (validDbm, i) => {
      const { primary, chunks } = await this.dbmToPrimaryAndChunks(validDbm)
      primaries[i] = primary
      if (chunks.length) allChunks.push(...chunks)
    })
    await this.savePrimaryAndChunks(table, primaries, allChunks, saveOptions, opt)

    if (saveOptions.assignGeneratedIds) {
      validDbms.forEach((dbm, i) => (dbms[i]!.id = dbm.id))
    }

    return validDbms
  }

  /**
   * Writes primaries to `table` and chunks to `${table}__chunks` in parallel, then cleans up
   * any orphan chunks per primary. Atomicity is not mitigated — simplicity
   * first. If either write fails, the other may still succeed (inconsistent state); a subsequent
   * save fixes it via orphan cleanup.
   */
  private async savePrimaryAndChunks(
    table: string,
    primaries: ObjectWithId[],
    chunks: ChunkRow[],
    primarySaveOptions: CommonDBSaveOptions<ObjectWithId>,
    opt: CommonDaoSaveOptions<BM, DBM>,
  ): Promise<void> {
    const dbOrTx = opt.tx || this.cfg.db
    const writes: Promise<any>[] = [dbOrTx.saveBatch(table, primaries, primarySaveOptions)]
    if (chunks.length) {
      // Chunks table ops go through cfg.db (outside transactional scope).
      writes.push(
        this.cfg.db.saveBatch(chunksTableFor(table), chunks as any, this.chunkSaveOptions()),
      )
    }
    await Promise.all(writes)

    // Orphan cleanup — coalesce all candidate ids across primaries into one set of batched
    // deleteByIds calls (respecting Datastore's 500-per-batch limit). Cfg-independent so
    // legacy chunks get cleaned up even after chunking is turned off.
    if (!this.cfg.compress?.keys?.length) return
    await this.cleanupOrphanChunksForMany(table, primaries, opt)
  }

  private prepareSaveOptions(
    opt: CommonDaoSaveOptions<BM, DBM>,
  ): CommonDBSaveOptions<ObjectWithId> {
    let {
      saveMethod,
      assignGeneratedIds = this.cfg.assignGeneratedIds,
      excludeFromIndexes = this.cfg.excludeFromIndexes,
    } = opt

    // If the user passed in custom `excludeFromIndexes` with the save() call,
    // and the auto-compression is enabled,
    // then we need to ensure that the reserved compression/chunking properties are in the list.
    if (this.cfg.compress?.keys) {
      excludeFromIndexes = excludeFromIndexes ? [...excludeFromIndexes] : []
      for (const key of PRIMARY_RESERVED_KEYS) {
        if (!excludeFromIndexes.includes(key as any)) {
          excludeFromIndexes.push(key as any)
        }
      }
    }

    if (this.cfg.immutable && !opt.allowMutability && !opt.saveMethod) {
      saveMethod = 'insert'
    }

    return {
      ...opt,
      excludeFromIndexes: excludeFromIndexes as (keyof ObjectWithId)[],
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

    const saveOptions = this.prepareSaveOptions(opt)
    const { beforeSave } = this.cfg.hooks!

    const { chunkSize = 500, chunkConcurrency = 32, errorMode } = opt

    // Convert bm → { primary, chunks } per row, accumulating into a window for batched writes.
    // For each batch: write primaries to T and all chunks to T__chunks in parallel; then run
    // orphan cleanup per primary.
    await p
      .map(
        async bm => {
          this.assignIdCreatedUpdated(bm, opt)
          const dbm = this.bmToDBM(bm, opt)
          beforeSave?.(dbm)
          return await this.dbmToPrimaryAndChunks(dbm)
        },
        { errorMode },
      )
      .chunk(chunkSize)
      .map(
        async batch => {
          const primaries: ObjectWithId[] = []
          const chunks: ChunkRow[] = []
          for (const b of batch) {
            primaries.push(b.primary)
            if (b.chunks.length) chunks.push(...b.chunks)
          }
          await this.savePrimaryAndChunks(table, primaries, chunks, saveOptions, opt)
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
    const dbOrTx = opt.tx || this.cfg.db

    // Parallel: delete primaries from T, delete any chunks from T__chunks via filterIn on primaryId.
    // Cfg-independent: fires the chunks-delete whenever compression is configured, so legacy
    // chunks are cleaned up even after chunking is turned off.
    const [primaryDeleted] = await Promise.all([
      dbOrTx.deleteByIds(table, ids, opt),
      this.deleteChunksByPrimaryIds(table, ids as string[], opt),
    ])
    return primaryDeleted
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

    // When compression is configured, chunks live in `${table}__chunks` which has no
    // user-queryable fields — we can't translate the user's query onto the chunks kind.
    // We must fetch primary ids first, then delete primaries + chunks in parallel.
    //
    // Default to streaming (chunkSize = 500) to avoid loading all ids into memory on large
    // deletes. Pass `opt.chunkSize` explicitly to tune.
    const useStreaming = opt.chunkSize || this.cfg.compress?.keys?.length
    if (useStreaming) {
      const { chunkSize = 500, chunkConcurrency = 8 } = opt

      await this.cfg.db
        .streamQuery<DBM>(q.select(['id']), opt)
        .mapSync(r => r.id)
        .chunk(chunkSize)
        .map(
          async ids => {
            await Promise.all([
              this.cfg.db.deleteByIds(q.table, ids, opt),
              this.deleteChunksByPrimaryIds(q.table, ids, opt),
            ])
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
    // patchByQuery bypasses the DAO layer (direct DB mutation). It cannot reassemble / re-chunk
    // compressed payloads, so we refuse to run when chunking is enabled.
    _assert(
      !this.cfg.compress?.chunk,
      `CommonDao "${this.cfg.table}": patchByQuery / patchByIds are not supported when compress.chunk is enabled. Use patchById (load + save) instead.`,
    )
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

  dbmToBM(_dbm: undefined, opt?: CommonDaoOptions): null
  dbmToBM(_dbm?: DBM, opt?: CommonDaoOptions): BM
  dbmToBM(_dbm?: DBM, opt: CommonDaoOptions = {}): BM | null {
    if (!_dbm) return null

    // optimization: no need to run full joi DBM validation, cause BM validation will be run
    // const dbm = this.anyToDBM(_dbm, opt)
    const dbm: DBM = { ..._dbm, ...this.cfg.hooks!.parseNaturalId!(_dbm.id as ID) }

    // DBM > BM
    const bm = (this.cfg.hooks!.beforeDBMToBM?.(dbm) || dbm) as Partial<BM>

    // Validate/convert BM
    return this.validateAndConvert(bm, 'load', opt)
  }

  dbmsToBM(dbms: DBM[], opt: CommonDaoOptions = {}): BM[] {
    return dbms.map(dbm => this.dbmToBM(dbm, opt))
  }

  /**
   * Mutates object with properties: id, created, updated.
   * Returns DBM (new reference).
   */
  bmToDBM(bm: undefined, opt?: CommonDaoOptions): null
  bmToDBM(bm?: BM, opt?: CommonDaoOptions): DBM
  bmToDBM(bm?: BM, opt?: CommonDaoOptions): DBM | null {
    if (bm === undefined) return null

    // bm gets assigned to the new reference
    bm = this.validateAndConvert(bm, 'save', opt)

    // BM > DBM
    const dbm = (this.cfg.hooks!.beforeBMToDBM?.(bm) || bm) as DBM

    return dbm
  }

  bmsToDBM(bms: BM[], opt: CommonDaoOptions = {}): DBM[] {
    return bms.map(bm => this.bmToDBM(bm, opt))
  }

  // STORAGE LAYER (compression/decompression at DB boundary)
  // These methods convert between DBM (logical model) and storage format (physical, possibly compressed).
  // Public methods allow external code to bypass the DAO layer for direct DB access
  // (e.g., cross-environment data copy).

  /**
   * Converts a DBM to storage format, applying compression if configured.
   *
   * Use this when you need to write directly to the database, bypassing the DAO save methods.
   * The returned value is opaque and should only be passed to db.saveBatch() or similar.
   *
   * @example
   * const storageRow = await dao.dbmToStorageRow(dbm)
   * await db.saveBatch(table, [storageRow])
   */
  async dbmToStorageRow(dbm: DBM): Promise<ObjectWithId> {
    if (!this.cfg.compress?.keys.length) return dbm
    const row = { ...dbm }
    await this.compress(row)
    return row
  }

  /**
   * Converts multiple DBMs to storage rows.
   */
  async dbmsToStorageRows(dbms: DBM[]): Promise<ObjectWithId[]> {
    if (!this.cfg.compress?.keys.length) return dbms
    return await pMap(dbms, async dbm => {
      const row = { ...dbm }
      await this.compress(row)
      return row
    })
  }

  /**
   * Converts a storage row back to a DBM, applying decompression if needed.
   *
   * Use this when you need to read directly from the database, bypassing the DAO load methods.
   *
   * @example
   * const rows = await db.getByIds(table, ids)
   * const dbms = await Promise.all(rows.map(row => dao.storageRowToDBM(row)))
   */
  storageRowToDBM(row: ObjectWithId): DBM {
    if (!this.cfg.compress?.keys.length) return row as DBM
    const dbm = { ...(row as DBM) }
    this.decompress(dbm)
    return dbm
  }

  /**
   * Converts multiple storage rows to DBMs.
   */
  storageRowsToDBM(rows: ObjectWithId[]): DBM[] {
    if (!this.cfg.compress?.keys.length) return rows as DBM[]
    return rows.map(row => {
      const dbm = { ...(row as DBM) }
      this.decompress(dbm)
      return dbm
    })
  }

  /**
   * Mutates `dbm`.
   */
  private async compress(dbm: DBM): Promise<void> {
    if (!this.cfg.compress?.keys.length) return // No compression requested

    const { keys, level = 1 } = this.cfg.compress
    const properties = _pick(dbm, keys)
    const bufferString = JSON.stringify(properties)
    // Unlike `decompress`, we're testing to use async zstd compression.
    // Async Decompression leaks memory severely. But Compression seems fine.
    const __compressed = await zip2.zstdCompress(bufferString, level)
    _omitWithUndefined(dbm as any, _objectKeys(properties), { mutate: true })
    Object.assign(dbm, { __compressed })
  }

  /**
   * Mutates `dbm`.
   */
  private decompress(dbm: DBM): void {
    _typeCast<Compressed<DBM>>(dbm)
    if (!Buffer.isBuffer(dbm.__compressed)) return // No compressed data

    const bufferString = zip2.zstdDecompressToStringSync(dbm.__compressed)
    const properties = JSON.parse(bufferString)
    dbm.__compressed = undefined
    Object.assign(dbm, properties)
  }

  // CHUNKING LAYER (below compression)
  // Primaries live in the configured table; chunks live in `${table}__chunks`.
  // Primary row carries queryable fields + chunk 0 in `__compressed` + `__chunks: N` (when N > 1).
  // Chunk rows: `{ id, primaryId, chunkIdx, __compressed }`. `primaryId` is indexed for
  // parallel fetch via `filterIn('primaryId', [...])`.

  /**
   * Deterministic chunk id: `${primaryId}__c${chunkIdx}`. Kept for debuggability and for
   * id-based orphan cleanup via deleteByIds.
   */
  private chunkIdFor(primaryId: string, chunkIdx: number): string {
    return `${primaryId}__c${chunkIdx}`
  }

  /**
   * Fetches chunks for the given primary ids. Returns `[]` if compression is not configured
   * on this DAO (so callers can fire this speculatively from `Promise.all` without branching).
   */
  private async fetchChunksByPrimaryIds(
    table: string,
    primaryIds: string[],
    opt: CommonDaoReadOptions,
  ): Promise<ChunkRow[]> {
    if (!this.cfg.compress?.keys?.length || !primaryIds.length) return []
    // Chunks table queries always go through cfg.db (DBTransaction has no runQuery).
    // Batch by FILTER_IN_BATCH_SIZE to respect Datastore's IN-filter value limit.
    const results = await pMap(_chunk(primaryIds, FILTER_IN_BATCH_SIZE), async batch => {
      const { rows } = await this.cfg.db.runQuery<ChunkRow>(this.chunksQuery(table, batch), opt)
      return rows
    })
    return results.flat()
  }

  /**
   * Builds a query against the chunks table that matches all chunks belonging to the given
   * primary ids. Used by both read paths (fetch-and-reassemble) and delete paths.
   *
   * Callers must keep `primaryIds.length <= FILTER_IN_BATCH_SIZE`.
   */
  private chunksQuery(table: string, primaryIds: string[]): DBQuery<ChunkRow> {
    return DBQuery.create<ChunkRow>(chunksTableFor(table)).filterIn('primaryId', primaryIds)
  }

  /**
   * Deletes all chunks belonging to the given primary ids. No-op when compression is not
   * configured on this DAO (so callers can fire this speculatively from `Promise.all` without
   * branching).
   *
   * Batches by FILTER_IN_BATCH_SIZE to respect Datastore's IN-filter value limit.
   */
  private async deleteChunksByPrimaryIds(
    table: string,
    primaryIds: string[],
    opt: CommonDaoOptions,
  ): Promise<void> {
    if (!this.cfg.compress?.keys?.length || !primaryIds.length) return
    await pMap(_chunk(primaryIds, FILTER_IN_BATCH_SIZE), batch =>
      this.cfg.db.deleteByQuery(this.chunksQuery(table, batch), opt),
    )
  }

  /**
   * Converts a DBM to a primary row and (if chunking is enabled and payload exceeds the threshold)
   * an array of chunk rows for the chunks table. Returns `{ primary, chunks }`.
   */
  private async dbmToPrimaryAndChunks(
    dbm: DBM,
  ): Promise<{ primary: ObjectWithId; chunks: ChunkRow[] }> {
    const primary = await this.dbmToStorageRow(dbm)
    const chunkCfg = this.cfg.compress?.chunk
    if (!chunkCfg) return { primary, chunks: [] }

    _typeCast<Compressed<DBM>>(primary)
    const compressed = primary.__compressed
    if (!Buffer.isBuffer(compressed)) return { primary, chunks: [] }

    const maxChunkSize =
      typeof chunkCfg === 'object'
        ? (chunkCfg.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE)
        : DEFAULT_MAX_CHUNK_SIZE

    if (compressed.length <= maxChunkSize) return { primary, chunks: [] }

    const n = Math.ceil(compressed.length / maxChunkSize)
    _assert(
      n <= MAX_CHUNKS_PER_ENTITY,
      `CommonDao "${this.cfg.table}": entity ${primary.id} compressed payload (${compressed.length} bytes) would require ${n} chunks, exceeding the hard limit of ${MAX_CHUNKS_PER_ENTITY}`,
    )

    // Use `Buffer.from(subarray)` to COPY the bytes. `subarray` alone returns a view that pins
    // the entire original buffer in memory as long as any chunk references it; `Buffer.slice`
    // is deprecated. `Buffer.from(Uint8Array)` allocates and copies.
    primary.__compressed = Buffer.from(compressed.subarray(0, maxChunkSize))
    primary.__chunks = n

    const chunks: ChunkRow[] = []
    for (let i = 1; i < n; i++) {
      chunks.push({
        id: this.chunkIdFor(primary.id, i),
        primaryId: primary.id,
        chunkIdx: i,
        __compressed: Buffer.from(compressed.subarray(i * maxChunkSize, (i + 1) * maxChunkSize)),
      })
    }
    return { primary, chunks }
  }

  /**
   * Reassembles chunked primaries in place. Cfg-independent — driven entirely by primary's
   * `__chunks: N` metadata. Works even after `compress.chunk` is turned off (legacy data
   * continues to read correctly until each entity is re-saved).
   *
   * `chunkRows` is the union of all chunks fetched from the chunks table for this set of
   * primaries. Orphans (chunks without a live primary, or beyond the primary's declared N)
   * are tolerated and ignored.
   */
  private reassembleChunks(primaries: ObjectWithId[], chunkRows: ChunkRow[]): void {
    if (!chunkRows.length) return

    // Group chunks by primaryId and sort each group by chunkIdx ascending.
    const chunksByPrimaryId = new Map<string, ChunkRow[]>()
    for (const cr of chunkRows) {
      const list = chunksByPrimaryId.get(cr.primaryId) ?? []
      list.push(cr)
      chunksByPrimaryId.set(cr.primaryId, list)
    }
    for (const list of chunksByPrimaryId.values()) {
      _sortBy(list, chunk => chunk.chunkIdx, { mutate: true })
    }

    for (const row of primaries) {
      const primary = row as Compressed<any>
      const n = primary.__chunks
      if (typeof n !== 'number' || n <= 1) continue

      const chunksOfPrimary = chunksByPrimaryId.get(primary.id) ?? []

      const parts: Buffer[] = []
      if (Buffer.isBuffer(primary.__compressed)) parts.push(primary.__compressed)
      // chunksOfPrimary[pos] is expected to have chunkIdx === pos + 1
      // (chunkIdx 0 is the primary's own `__compressed`; extra chunks are 1..n-1).
      const expectedCount = n - 1
      for (let pos = 0; pos < expectedCount; pos++) {
        const cr = chunksOfPrimary[pos]
        const chunkIdx = pos + 1
        _assert(
          cr && cr.chunkIdx === chunkIdx && Buffer.isBuffer(cr.__compressed),
          `CommonDao "${this.cfg.table}": missing chunk ${chunkIdx}/${expectedCount} for entity ${primary.id}`,
        )
        parts.push(cr.__compressed)
      }
      primary.__compressed = Buffer.concat(parts)
      primary.__chunks = undefined
    }
  }

  /**
   * Save options for chunk rows. Only `__compressed` is excluded from indexes — `primaryId`
   * and `chunkIdx` ARE indexed so we can query chunks by primaryId cheaply.
   */
  private chunkSaveOptions(): CommonDBSaveOptions<ObjectWithId> {
    return { excludeFromIndexes: [...CHUNK_RESERVED_KEYS] as any }
  }

  /**
   * Delete orphan chunks for a batch of primaries after a save.
   *
   * Strategy: for each primary, run `runQueryCount(filterEq('primaryId', id))` to learn the
   * exact number of chunk rows currently in the chunks table. From that we compute the precise
   * orphan range `[newN, currentCount]` (inclusive) and delete only those ids.
   *
   * Assumes chunks are always written contiguously (chunkIdx 1..N-1 for a primary with
   * `__chunks: N`) — which the save path guarantees. No composite index required; relies only
   * on the built-in single-field index on `primaryId`.
   *
   * Showcase alternative (commented out): if you deploy a composite index
   * `(primaryId ASC, chunkIdx ASC)` on `${table}__chunks`, you can replace the count-then-delete
   * with a single range-filtered `deleteByQuery` per primary.
   */
  private async cleanupOrphanChunksForMany(
    table: string,
    primaries: ObjectWithId[],
    opt: CommonDaoOptions,
  ): Promise<void> {
    const chunksTable = chunksTableFor(table)

    // 1. For each primary, count existing chunk rows.
    const counts = await pMap(primaries, async primary =>
      this.cfg.db.runQueryCount(
        DBQuery.create<ChunkRow>(chunksTable).filterEq('primaryId', primary.id),
        opt,
      ),
    )

    // 2. Compute exact orphan ids per primary. Orphans = rows at chunkIdx in [newN, count].
    const orphanIds: string[] = []
    for (let i = 0; i < primaries.length; i++) {
      const primary = primaries[i]!
      const newN = (primary as Compressed<any>).__chunks ?? 1
      const currentCount = counts[i]!
      // Chunk rows exist at chunkIdx 1..currentCount; orphans are those at chunkIdx >= newN.
      for (let idx = newN; idx <= currentCount; idx++) {
        orphanIds.push(this.chunkIdFor(primary.id, idx))
      }
    }
    if (!orphanIds.length) return

    // 3. Delete orphan ids in batches of DELETE_BY_IDS_BATCH_SIZE. Chunks table ops go
    // through cfg.db (outside transactional scope).
    await pMap(_chunk(orphanIds, DELETE_BY_IDS_BATCH_SIZE), batch =>
      this.cfg.db.deleteByIds(chunksTable, batch, opt),
    )
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

  async getTableSchema(): Promise<JsonSchema<DBM>> {
    return await this.cfg.db.getTableSchema<DBM>(this.cfg.table)
  }

  async createTable(schema: JsonSchema<DBM>, opt?: CommonDaoCreateOptions): Promise<void> {
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

    // When any input dao uses chunking, reassemble extra chunks for its primaries.
    await CommonDao.multiGetReassembleChunks(inputMap, dbmsByTable, opt)

    const dbmByTableById = CommonDao.multiGetMapByTableById(dbmsByTable)

    return CommonDao.prepareMultiGetOutput(inputMap, dbmByTableById, opt) as any
  }

  /**
   * For each table whose input DAO has compression configured, fetch the primaries' chunks
   * from `${table}__chunks` and reassemble in place. Cfg-independent dechunking — driven by
   * primary's __chunks metadata.
   */
  private static async multiGetReassembleChunks(
    inputMap: StringMap<DaoWithIds<AnyDao> | DaoWithId<AnyDao>>,
    dbmsByTable: StringMap<ObjectWithId[]>,
    opt: CommonDaoReadOptions,
  ): Promise<void> {
    const daoByTable: StringMap<AnyDao> = {}
    for (const input of _stringMapValues(inputMap)) {
      const { table } = input.dao.cfg
      daoByTable[table] ||= input.dao
    }

    for (const [table, primaries] of _stringMapEntries(dbmsByTable)) {
      const dao = daoByTable[table]
      if (!dao?.cfg.compress?.keys?.length) continue
      await (dao as any).fetchAndReassembleChunks(table, primaries, opt)
    }
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

  private static prepareMultiGetOutput(
    inputMap: StringMap<DaoWithIds<AnyDao> | DaoWithId<AnyDao>>,
    dbmByTableById: StringMap<StringMap<ObjectWithId>>,
    opt: CommonDaoReadOptions = {},
  ): StringMap<unknown> {
    const bmsByProp: StringMap<unknown> = {}

    // Loop over input props again, to produce the output of the same shape as requested
    for (const [prop, input] of _stringMapEntries(inputMap)) {
      const { dao } = input
      const { table } = dao.cfg
      if ('id' in input) {
        // Singular
        const row = dbmByTableById[table]![input.id]
        // Decompress before converting to BM
        const dbm = row ? dao.storageRowToDBM(row) : undefined
        bmsByProp[prop] = dao.dbmToBM(dbm, opt) || null
      } else {
        // Plural
        // We apply filtering, to be able to support multiple input props fetching from the same table.
        // Without filtering - every prop will get ALL rows from that table.
        const rows = input.ids.map(id => dbmByTableById[table]![id]).filter(_isTruthy)
        // Decompress before converting to BM
        const dbms = dao.storageRowsToDBM(rows)
        bmsByProp[prop] = dao.dbmsToBM(dbms, opt)
      }
    }

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
    // Track dao per table so we can expand ids with chunks below.
    const daoByTable: StringMap<AnyDao> = {}
    for (const input of inputs) {
      const { dao } = input
      const { table } = dao.cfg
      dao.requireWriteAccess()
      dao.requireObjectMutability(opt)
      idsByTable[table] ||= []
      daoByTable[table] ||= dao

      if ('id' in input) {
        idsByTable[table].push(input.id)
      } else {
        idsByTable[table].push(...input.ids)
      }
    }

    // Collect chunks-cleanup operations for any table whose DAO has compression configured.
    // Route through `deleteChunksByPrimaryIds` so the filterIn batching applies.
    const chunkDeletes: Promise<unknown>[] = []
    for (const [table, ids] of _stringMapEntries(idsByTable)) {
      const dao = daoByTable[table]
      if (!dao?.cfg.compress?.keys?.length || !ids.length) continue
      chunkDeletes.push((dao as any).deleteChunksByPrimaryIds(table, ids, opt))
    }

    // Delete primaries and chunks in parallel. Return the primary deletion count.
    const [deletedCount] = await Promise.all([db.multiDelete(idsByTable, opt), ...chunkDeletes])
    return deletedCount
  }

  static async multiSave(
    inputs: (DaoWithRows<AnyDao> | DaoWithRow<AnyDao>)[],
    opt: CommonDaoSaveBatchOptions<any> = {},
  ): Promise<void> {
    if (!inputs.length) return
    const { db } = inputs[0]!.dao.cfg
    const dbmsByTable: StringMap<any[]> = {}
    const daoByTable: StringMap<AnyDao> = {}
    await pMap(inputs, async input => {
      const { dao } = input
      const { table } = dao.cfg
      dbmsByTable[table] ||= []
      daoByTable[table] ||= dao

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
        const dbm = dao.bmToDBM(row, opt)
        dao.cfg.hooks!.beforeSave?.(dbm)
        const { primary, chunks } = await (dao as any).dbmToPrimaryAndChunks(dbm)
        dbmsByTable[table].push(primary)
        if (chunks.length) {
          const ct = chunksTableFor(table)
          dbmsByTable[ct] ||= []
          dbmsByTable[ct].push(...chunks)
        }
      } else {
        // Plural
        input.rows.forEach(bm => dao.assignIdCreatedUpdated(bm, opt))
        const dbms = dao.bmsToDBM(input.rows, opt)
        if (dao.cfg.hooks!.beforeSave) {
          dbms.forEach(dbm => dao.cfg.hooks!.beforeSave!(dbm))
        }
        await pMap(dbms, async (dbm: any) => {
          const { primary, chunks } = await (dao as any).dbmToPrimaryAndChunks(dbm)
          dbmsByTable[table]!.push(primary)
          if (chunks.length) {
            const ct = chunksTableFor(table)
            dbmsByTable[ct] ||= []
            dbmsByTable[ct].push(...chunks)
          }
        })
      }
    })

    await db.multiSave(dbmsByTable)

    // Orphan cleanup for any table whose DAO has compression configured. Skip rows that live
    // in a chunks table (`${table}__chunks`) — those aren't primaries.
    for (const [table, rows] of _stringMapEntries(dbmsByTable)) {
      const dao = daoByTable[table]
      if (!dao?.cfg.compress?.keys?.length) continue
      await (dao as any).cleanupOrphanChunksForMany(table, rows, opt)
    }
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
 * Derives the chunks-table name for a given primary table. Chunks live in a dedicated kind.
 */
function chunksTableFor(table: string): string {
  return `${table}__chunks`
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
 * Represents a PRIMARY row whose properties have been compressed into a `__compressed` Buffer.
 *
 * `__chunks: N` is set on the primary row of a chunked entity (total chunk count, N >= 2).
 * The first chunk's bytes live in `__compressed` on the primary; chunks 1..N-1 live in
 * the dedicated chunks table (`${table}__chunks`).
 */
type Compressed<DBM> = DBM & {
  __compressed?: Buffer
  __chunks?: number
}

/**
 * Shape of a row in the chunks table.
 */
interface ChunkRow {
  id: string
  primaryId: string
  chunkIdx: number
  __compressed: Buffer
}
