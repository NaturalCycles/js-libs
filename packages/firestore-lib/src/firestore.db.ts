import type {
  DocumentReference,
  Firestore,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  Transaction,
  UpdateData,
} from '@google-cloud/firestore'
import { FieldValue } from '@google-cloud/firestore'
import type {
  CommonDB,
  CommonDBOptions,
  CommonDBReadOptions,
  CommonDBSaveMethod,
  CommonDBSaveOptions,
  CommonDBSupport,
  CommonDBTransactionOptions,
  DBQuery,
  DBTransaction,
  DBTransactionFn,
  RunQueryResult,
} from '@naturalcycles/db-lib'
import { BaseCommonDB, commonDBFullSupport } from '@naturalcycles/db-lib'
import { _isTruthy } from '@naturalcycles/js-lib'
import { _chunk } from '@naturalcycles/js-lib/array/array.util.js'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import type { CommonLogger, CommonLogLevel } from '@naturalcycles/js-lib/log'
import { _filterUndefinedValues, _omit } from '@naturalcycles/js-lib/object/object.util.js'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import type { ObjectWithId, PositiveInteger, StringMap } from '@naturalcycles/js-lib/types'
import { _stringMapEntries } from '@naturalcycles/js-lib/types'
import { Pipeline, type ReadableTyped } from '@naturalcycles/nodejs-lib/stream'
import { escapeDocId, unescapeDocId } from './firestore.util.js'
import { FirestoreShardedReadable } from './firestoreShardedReadable.js'
import { FirestoreStreamReadable } from './firestoreStreamReadable.js'
import { dbQueryToFirestoreQuery } from './query.util.js'

export class FirestoreDB extends BaseCommonDB implements CommonDB {
  constructor(cfg: FirestoreDBCfg) {
    super()
    this.cfg = {
      logger: console,
      ...cfg,
    }
  }

  cfg: FirestoreDBCfg & { logger: CommonLogger }

  override support: CommonDBSupport = {
    ...commonDBFullSupport,
    patchByQuery: false, // todo: can be implemented
    tableSchemas: false,
    createTransaction: false, // Firestore SDK doesn't support it
  }

  // GET
  override async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: string[],
    opt: FirestoreDBReadOptions = {},
  ): Promise<ROW[]> {
    if (!ids.length) return []

    // todo: support PITR: https://firebase.google.com/docs/firestore/enterprise/use-pitr#read-pitr

    const { firestore } = this.cfg
    const col = firestore.collection(table)

    return (
      await ((opt.tx as FirestoreDBTransaction)?.tx || firestore).getAll(
        ...ids.map(id => col.doc(escapeDocId(id))),
      )
    )
      .map(doc => {
        const data = doc.data()
        if (data === undefined) return
        return {
          id: unescapeDocId(doc.id),
          ...data,
        } as ROW
      })
      .filter(_isTruthy)
  }

  override async multiGet<ROW extends ObjectWithId>(
    map: StringMap<string[]>,
    opt: CommonDBReadOptions = {},
  ): Promise<StringMap<ROW[]>> {
    const result: StringMap<ROW[]> = {}
    const { firestore } = this.cfg
    const refs: DocumentReference[] = []
    for (const [table, ids] of _stringMapEntries(map)) {
      result[table] = []
      const col = firestore.collection(table)
      refs.push(...ids.map(id => col.doc(escapeDocId(id))))
    }

    const snapshots = await ((opt.tx as FirestoreDBTransaction)?.tx || firestore).getAll(...refs)
    snapshots.forEach(snap => {
      const data = snap.data()
      if (data === undefined) return
      const table = snap.ref.parent.id
      const row = {
        id: unescapeDocId(snap.id),
        ...data,
      } as ROW
      result[table]!.push(row)
    })

    return result
  }

  // QUERY
  override async runQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt?: FirestoreDBOptions,
  ): Promise<RunQueryResult<ROW>> {
    const idFilter = q._filters.find(f => f.name === 'id')
    if (idFilter) {
      const ids: string[] = Array.isArray(idFilter.val) ? idFilter.val : [idFilter.val]
      return {
        rows: await this.getByIds(q.table, ids, opt),
      }
    }

    const firestoreQuery = dbQueryToFirestoreQuery(q, this.cfg.firestore.collection(q.table))

    let rows = await this.runFirestoreQuery<ROW>(firestoreQuery)

    // Special case when projection query didn't specify 'id'
    if (q._selectedFieldNames && !q._selectedFieldNames.includes('id')) {
      rows = rows.map(r => _omit(r, ['id']))
    }

    return { rows }
  }

  async runFirestoreQuery<ROW extends ObjectWithId>(q: Query): Promise<ROW[]> {
    return this.querySnapshotToArray(await q.get())
  }

  override async runQueryCount<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: FirestoreDBOptions,
  ): Promise<number> {
    const firestoreQuery = dbQueryToFirestoreQuery(q, this.cfg.firestore.collection(q.table))
    const r = await firestoreQuery.count().get()
    return r.data().count
  }

  override streamQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt_?: FirestoreDBStreamOptions,
  ): Pipeline<ROW> {
    const firestoreQuery = dbQueryToFirestoreQuery(q, this.cfg.firestore.collection(q.table))

    const opt: FirestoreDBStreamOptions = {
      logger: this.cfg.logger,
      logLevel: this.cfg.logLevel,
      ...this.cfg.streamOptions,
      ...opt_,
    }

    if (opt.experimentalCursorStream) {
      return Pipeline.from(new FirestoreStreamReadable(firestoreQuery, q, opt))
    }

    if (opt.experimentalShardedStream) {
      return Pipeline.from(new FirestoreShardedReadable(firestoreQuery, q, opt))
    }

    return Pipeline.from(
      (firestoreQuery.stream() as ReadableTyped<QueryDocumentSnapshot<any>>).map(doc => {
        return {
          id: unescapeDocId(doc.id),
          ...doc.data(),
        } as ROW
      }),
    )
  }

  // SAVE
  override async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rows: ROW[],
    opt: FirestoreDBSaveOptions<ROW> = {},
  ): Promise<void> {
    const { firestore } = this.cfg
    const col = firestore.collection(table)
    const method: SaveOp = methodMap[opt.saveMethod!] || 'set'

    if (opt.tx) {
      const { tx } = opt.tx as FirestoreDBTransaction

      for (const row of rows) {
        _assert(
          row.id,
          `firestore-db doesn't support id auto-generation, but empty id was provided in saveBatch`,
        )

        const { id, ...rowWithoutId } = row
        tx[method as 'set' | 'create'](
          col.doc(escapeDocId(id)),
          _filterUndefinedValues(rowWithoutId),
        )
      }
      return
    }

    await pMap(
      _chunk(rows, MAX_ITEMS),
      async chunk => {
        // .batch is called "Atomic batch writer"
        // Executes multiple writes in a single atomic transaction-like commit — all succeed or all fail.
        // If any write in the batch fails (e.g., permission error, missing doc), the whole batch fails.
        // Good for small, related sets of writes where consistency is critical.
        const batch = firestore.batch()

        for (const row of chunk) {
          _assert(
            row.id,
            `firestore-db doesn't support id auto-generation, but empty id was provided in saveBatch`,
          )
          const { id, ...rowWithoutId } = row
          batch[method as 'set' | 'create'](
            col.doc(escapeDocId(id)),
            _filterUndefinedValues(rowWithoutId),
          )
        }

        await batch.commit()
      },
      { concurrency: FIRESTORE_RECOMMENDED_CONCURRENCY },
    )
  }

  override async multiSave<ROW extends ObjectWithId>(
    map: StringMap<ROW[]>,
    opt: FirestoreDBSaveOptions<ROW> = {},
  ): Promise<void> {
    const { firestore } = this.cfg
    const method: SaveOp = methodMap[opt.saveMethod!] || 'set'

    if (opt.tx) {
      const { tx } = opt.tx as FirestoreDBTransaction

      for (const [table, rows] of _stringMapEntries(map)) {
        const col = firestore.collection(table)
        for (const row of rows) {
          _assert(
            row.id,
            `firestore-db doesn't support id auto-generation, but empty id was provided in multiSaveBatch`,
          )

          const { id, ...rowWithoutId } = row
          tx[method as 'set' | 'create'](
            col.doc(escapeDocId(id)),
            _filterUndefinedValues(rowWithoutId),
          )
        }
      }
      return
    }

    const tableRows: TableRow<ROW>[] = []
    for (const [table, rows] of _stringMapEntries(map)) {
      for (const row of rows) {
        tableRows.push([table, row])
      }
    }

    await pMap(
      _chunk(tableRows, MAX_ITEMS),
      async chunk => {
        const batch = firestore.batch()

        for (const [table, row] of chunk) {
          _assert(
            row.id,
            `firestore-db doesn't support id auto-generation, but empty id was provided in multiSaveBatch`,
          )
          const { id, ...rowWithoutId } = row
          batch[method as 'set' | 'create'](
            firestore.collection(table).doc(escapeDocId(id)),
            _filterUndefinedValues(rowWithoutId),
          )
        }

        await batch.commit()
      },
      { concurrency: FIRESTORE_RECOMMENDED_CONCURRENCY },
    )
  }

  override async patchById<ROW extends ObjectWithId>(
    table: string,
    id: string,
    patch: Partial<ROW>,
    opt: FirestoreDBOptions = {},
  ): Promise<void> {
    const { firestore } = this.cfg
    const col = firestore.collection(table)

    if (opt.tx) {
      const { tx } = opt.tx as FirestoreDBTransaction
      tx.update(col.doc(escapeDocId(id)), patch as UpdateData<ROW>)
      return
    }

    await col.doc(escapeDocId(id)).update(patch)
  }

  // DELETE
  override async deleteByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt?: FirestoreDBOptions,
  ): Promise<number> {
    let ids: string[]

    const idFilter = q._filters.find(f => f.name === 'id')
    if (idFilter) {
      ids = Array.isArray(idFilter.val) ? idFilter.val : [idFilter.val]
    } else {
      const firestoreQuery = dbQueryToFirestoreQuery(
        q.select([]),
        this.cfg.firestore.collection(q.table),
      )
      ids = (await this.runFirestoreQuery<ObjectWithId>(firestoreQuery)).map(obj => obj.id)
    }

    await this.deleteByIds(q.table, ids, opt)

    return ids.length
  }

  override async deleteByIds(
    table: string,
    ids: string[],
    opt: FirestoreDBOptions = {},
  ): Promise<number> {
    const { firestore } = this.cfg
    const col = firestore.collection(table)

    if (opt.tx) {
      const { tx } = opt.tx as FirestoreDBTransaction

      for (const id of ids) {
        tx.delete(col.doc(escapeDocId(id)))
      }
      return ids.length
    }

    await pMap(
      _chunk(ids, MAX_ITEMS),
      async chunk => {
        const batch = firestore.batch()
        for (const id of chunk) {
          batch.delete(col.doc(escapeDocId(id)))
        }
        await batch.commit()
      },
      { concurrency: FIRESTORE_RECOMMENDED_CONCURRENCY },
    )

    return ids.length
  }

  override async multiDelete(
    map: StringMap<string[]>,
    opt: FirestoreDBOptions = {},
  ): Promise<number> {
    const { firestore } = this.cfg
    const refs: DocumentReference[] = []
    for (const [table, ids] of _stringMapEntries(map)) {
      const col = firestore.collection(table)
      refs.push(...ids.map(id => col.doc(escapeDocId(id))))
    }

    if (opt.tx) {
      const { tx } = opt.tx as FirestoreDBTransaction
      for (const ref of refs) {
        tx.delete(ref)
      }
    } else {
      await pMap(
        _chunk(refs, MAX_ITEMS),
        async chunk => {
          const batch = firestore.batch()
          for (const ref of chunk) {
            batch.delete(ref)
          }
          await batch.commit()
        },
        { concurrency: FIRESTORE_RECOMMENDED_CONCURRENCY },
      )
    }

    return refs.length
  }

  querySnapshotToArray<T = any>(qs: QuerySnapshot): T[] {
    return qs.docs.map(
      doc =>
        ({
          id: unescapeDocId(doc.id),
          ...doc.data(),
        }) as T,
    )
  }

  override async runInTransaction(
    fn: DBTransactionFn,
    opt: CommonDBTransactionOptions = {},
  ): Promise<void> {
    const { readOnly } = opt

    try {
      await this.cfg.firestore.runTransaction(
        async firestoreTx => {
          const tx = new FirestoreDBTransaction(this, firestoreTx)
          await fn(tx)
        },
        {
          readOnly,
        },
      )
    } catch (err) {
      if (err instanceof RollbackError) {
        // RollbackError should be handled gracefully (not re-throw)
        return
      }
      throw err
    }
  }

  /**
   * Caveat: it always returns an empty object, not the actual incrementMap.
   */
  override async incrementBatch(
    table: string,
    prop: string,
    incrementMap: StringMap<number>,
    _opt?: CommonDBOptions,
  ): Promise<StringMap<number>> {
    const { firestore } = this.cfg
    const col = firestore.collection(table)
    const batch = firestore.batch()

    for (const [id, increment] of _stringMapEntries(incrementMap)) {
      batch.set(
        col.doc(escapeDocId(id)),
        {
          [prop]: FieldValue.increment(increment),
        },
        { merge: true },
      )
    }

    await batch.commit()
    return {}
  }

  override async ping(): Promise<void> {
    // no-op now
  }

  override async getTables(): Promise<string[]> {
    return []
  }
}

/**
 * https://firebase.google.com/docs/firestore/manage-data/transactions
 */
export class FirestoreDBTransaction implements DBTransaction {
  constructor(
    public db: FirestoreDB,
    public tx: Transaction,
  ) {}

  async commit(): Promise<void> {
    throw new Error('FirestoreDBTransaction.commit() is not implemented')
  }

  async rollback(): Promise<void> {
    throw new RollbackError()
  }

  async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: string[],
    opt?: CommonDBOptions,
  ): Promise<ROW[]> {
    return await this.db.getByIds(table, ids, { ...opt, tx: this })
  }

  async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rows: ROW[],
    opt?: CommonDBSaveOptions<ROW>,
  ): Promise<void> {
    await this.db.saveBatch(table, rows, { ...opt, tx: this })
  }

  async deleteByIds(table: string, ids: string[], opt?: CommonDBOptions): Promise<number> {
    return await this.db.deleteByIds(table, ids, { ...opt, tx: this })
  }
}

// Datastore (also Firestore and other Google APIs) supports max 500 of items when saving/deleting, etc.
const MAX_ITEMS = 500
// It's an empyrical value, but anything less than infinity is better than infinity
const FIRESTORE_RECOMMENDED_CONCURRENCY = 8

type TableRow<ROW extends ObjectWithId> = [table: string, row: ROW]

export interface FirestoreDBCfg {
  firestore: Firestore

  /**
   * Use it to set default options to stream operations,
   * e.g you can globally enable `experimentalCursorStream` here, set the batchSize, etc.
   */
  streamOptions?: FirestoreDBStreamOptions

  /**
   * Default to `console`
   */
  logger?: CommonLogger

  logLevel?: CommonLogLevel
}

const methodMap: Record<CommonDBSaveMethod, SaveOp> = {
  insert: 'create',
  update: 'update',
  upsert: 'set',
}

export class RollbackError extends Error {
  constructor() {
    super('rollback')
  }
}

export interface FirestoreDBStreamOptions extends FirestoreDBReadOptions {
  /**
   * Set to `true` to stream via experimental "cursor-query based stream".
   *
   * Defaults to false
   */
  experimentalCursorStream?: boolean

  experimentalShardedStream?: boolean

  /**
   * Applicable to `experimentalCursorStream`.
   * Defines the size (limit) of each individual query.
   *
   * Default: 10_000
   */
  batchSize?: PositiveInteger

  /**
   * Defaults to 3x batchSize.
   * Default batchSize is 10_000, so default highWaterMark is 30_000.
   * Controls how many rows to have "buffered".
   * Should be at least 1x batchSize, otherwise the stream will be "starving"
   * between the queries.
   */
  highWaterMark?: PositiveInteger

  logger?: CommonLogger

  /**
   * Defaults to `log`.
   * Set to `debug` to allow for extra debugging, e.g in experimentalCursorStream.
   */
  logLevel?: CommonLogLevel
}

export interface FirestoreDBOptions extends CommonDBOptions {}
export interface FirestoreDBReadOptions extends CommonDBReadOptions {}
export interface FirestoreDBSaveOptions<ROW extends ObjectWithId>
  extends CommonDBSaveOptions<ROW> {}

type SaveOp = 'create' | 'update' | 'set'
