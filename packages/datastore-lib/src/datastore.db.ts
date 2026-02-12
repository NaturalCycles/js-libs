import type { Key, Query, Transaction } from '@google-cloud/datastore'
import { Datastore, PropertyFilter } from '@google-cloud/datastore'
import type { RunQueryOptions } from '@google-cloud/datastore/build/src/query.js'
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
import { _chunk } from '@naturalcycles/js-lib/array/array.util.js'
import { _ms } from '@naturalcycles/js-lib/datetime/time.util.js'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { _errorDataAppend, TimeoutError } from '@naturalcycles/js-lib/error/error.util.js'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { _omit } from '@naturalcycles/js-lib/object/object.util.js'
import type { PRetryOptions } from '@naturalcycles/js-lib/promise'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import { pRetry, pRetryFn } from '@naturalcycles/js-lib/promise/pRetry.js'
import { pTimeout } from '@naturalcycles/js-lib/promise/pTimeout.js'
import { _stringMapEntries, _stringMapValues } from '@naturalcycles/js-lib/types'
import type { ObjectWithId, StringMap } from '@naturalcycles/js-lib/types'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import { boldWhite } from '@naturalcycles/nodejs-lib/colors'
import { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import type {
  DatastoreDBCfg,
  DatastoreDBOptions,
  DatastoreDBReadOptions,
  DatastoreDBSaveOptions,
  DatastoreDBStreamOptions,
  DatastorePayload,
  DatastorePropertyStats,
  DatastoreStats,
} from './datastore.model.js'
import { DatastoreType } from './datastore.model.js'
import { DatastoreStreamReadable } from './datastoreStreamReadable.js'
import { dbQueryToDatastoreQuery, getRunQueryOptions } from './query.util.js'

// Datastore (also Firestore and other Google APIs) supports max 500 of items when saving/deleting, etc.
const MAX_ITEMS = 500
// It's an empyrical value, but anything less than infinity is better than infinity
const DATASTORE_RECOMMENDED_CONCURRENCY = 8

const RETRY_ON = [
  'GOAWAY',
  'UNAVAILABLE',
  'UNKNOWN',
  'DEADLINE_EXCEEDED',
  'ABORTED',
  'much contention',
  'try again',
  'timeout',
].map(s => s.toLowerCase())
// Examples of errors:
// UNKNOWN: Stream removed

const DATASTORE_TIMEOUT = 'DATASTORE_TIMEOUT'

const methodMap: Record<CommonDBSaveMethod, string> = {
  insert: 'insert',
  update: 'update',
  upsert: 'save',
}

/**
 * Datastore API:
 * https://googlecloudplatform.github.io/google-cloud-node/#/docs/datastore/1.0.3/datastore
 * https://cloud.google.com/datastore/docs/datastore-api-tutorial
 */
export class DatastoreDB extends BaseCommonDB implements CommonDB {
  override support: CommonDBSupport = {
    ...commonDBFullSupport,
    patchByQuery: false,
    patchById: false, // use Firestore for that
    increment: false,
  }

  constructor(cfg: DatastoreDBCfg = {}) {
    super()
    this.cfg = {
      logger: console,
      ...cfg,
    }
  }

  cfg: DatastoreDBCfg & { logger: CommonLogger }

  private cachedDatastore?: Datastore

  /**
   * Datastore.KEY
   */
  protected KEY!: symbol

  // @memo() // not used to be able to connect to many DBs in the same server instance
  ds(): Datastore {
    if (!this.cachedDatastore) {
      _assert(
        process.env['APP_ENV'] !== 'test',
        'DatastoreDB cannot be used in Test env, please use InMemoryDB',
      )

      this.cfg.projectId ||= this.cfg.credentials?.project_id || process.env['GOOGLE_CLOUD_PROJECT']

      if (this.cfg.projectId) {
        this.cfg.logger.log(`DatastoreDB connected to ${boldWhite(this.cfg.projectId)}`)
      } else if (process.env['GOOGLE_APPLICATION_CREDENTIALS']) {
        this.cfg.logger.log(`DatastoreDB connected via GOOGLE_APPLICATION_CREDENTIALS`)
      }

      if (this.cfg.grpc) {
        this.cfg.logger.log('!!! DatastoreDB using custom grpc !!!')
      }

      this.cachedDatastore = new Datastore(this.cfg)
      this.KEY = this.cachedDatastore.KEY
    }

    return this.cachedDatastore
  }

  override async ping(): Promise<void> {
    await this.getAllStats()
  }

  override async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: string[],
    opt: DatastoreDBReadOptions = {},
  ): Promise<ROW[]> {
    if (!ids.length) return []
    let ds = this.ds()
    const keys = ids.map(id => this.key(ds, table, id))
    let rows: any[]

    const dsOpt = getRunQueryOptions(opt)

    if (this.cfg.timeout) {
      // First try
      try {
        const r = await pTimeout(
          () => ((opt.tx as DatastoreDBTransaction)?.tx || ds).get(keys, dsOpt),
          {
            timeout: this.cfg.timeout,
            name: `datastore.getByIds(${table})`,
          },
        )
        rows = r[0]
      } catch (err) {
        if (!(err instanceof TimeoutError)) {
          // Not a timeout error, re-throw
          throw err
        }

        this.cfg.logger.log(
          `datastore recreated on timeout (${_ms(this.cfg.timeout)}) while loading ${table}`,
        )

        // This is to debug "GCP Datastore Timeout issue"
        ds = this.cachedDatastore = new Datastore(this.cfg)

        // Second try (will throw)
        try {
          const r = await pRetry(
            () => ((opt.tx as DatastoreDBTransaction)?.tx || ds).get(keys, dsOpt),
            {
              ...this.getPRetryOptions(`datastore.getByIds(${table}) second try`),
              maxAttempts: 3,
              timeout: this.cfg.timeout,
            },
          )
          rows = r[0]
        } catch (err) {
          if (err instanceof TimeoutError) {
            _errorDataAppend(err, {
              fingerprint: DATASTORE_TIMEOUT,
            })
          }
          throw err
        }
      }
    } else {
      rows = await pRetry(
        async () => {
          return (await ds.get(keys, dsOpt))[0]
        },
        this.getPRetryOptions(`datastore.getByIds(${table})`),
      )
    }

    return (
      rows
        .map(r => this.mapId<ROW>(r))
        // Seems like datastore .get() method doesn't return items properly sorted by input ids, so we gonna sort them here
        // same ids are not expected here
        .sort(idComparator)
    )
  }

  override async multiGet<ROW extends ObjectWithId>(
    map: StringMap<string[]>,
    opt: DatastoreDBReadOptions = {},
  ): Promise<StringMap<ROW[]>> {
    const result: StringMap<ROW[]> = {}
    const ds = this.ds()
    const dsOpt = getRunQueryOptions(opt)
    const keys: Key[] = []
    for (const [table, ids] of _stringMapEntries(map)) {
      result[table] = []
      keys.push(...ids.map(id => this.key(ds, table, id)))
    }

    const r = await ds.get(keys, dsOpt)
    const rows: any[] = r[0]

    rows.forEach(entity => {
      const [kind, row] = this.parseDatastoreEntity<ROW>(entity)
      result[kind]!.push(row)
    })

    // Seems like datastore .get() method doesn't return items properly sorted by input ids, so we gonna sort them here
    // same ids are not expected here
    for (const tableRows of _stringMapValues(result)) {
      tableRows.sort(idComparator)
    }

    return result
  }

  // getQueryKind(q: Query): string {
  //   if (!q?.kinds?.length) return '' // should never be the case, but
  //   return q.kinds[0]!
  // }

  override async runQuery<ROW extends ObjectWithId>(
    dbQuery: DBQuery<ROW>,
    opt: DatastoreDBReadOptions = {},
  ): Promise<RunQueryResult<ROW>> {
    const idFilter = dbQuery._filters.find(f => f.name === 'id')
    if (idFilter) {
      const ids: string[] = idFilter.op === '==' ? [idFilter.val] : idFilter.val

      return {
        rows: await this.getByIds(dbQuery.table, ids, opt),
      }
    }

    const ds = this.ds()
    const q = dbQueryToDatastoreQuery(dbQuery, ds.createQuery(dbQuery.table))
    const dsOpt = getRunQueryOptions(opt)
    const qr = await this.runDatastoreQuery<ROW>(q, dsOpt)

    // Special case when projection query didn't specify 'id'
    if (dbQuery._selectedFieldNames && !dbQuery._selectedFieldNames.includes('id')) {
      qr.rows = qr.rows.map(r => _omit(r as any, ['id']))
    }

    return qr
  }

  override async runQueryCount<ROW extends ObjectWithId>(
    dbQuery: DBQuery<ROW>,
    opt: DatastoreDBReadOptions = {},
  ): Promise<number> {
    const ds = this.ds()
    const q = dbQueryToDatastoreQuery(dbQuery, ds.createQuery(dbQuery.table))
    const aq = ds.createAggregationQuery(q).count('count')
    const dsOpt = getRunQueryOptions(opt)
    const [entities] = await ds.runAggregationQuery(aq, dsOpt)
    return entities[0]?.count
  }

  private async runDatastoreQuery<ROW extends ObjectWithId>(
    q: Query,
    dsOpt: RunQueryOptions,
  ): Promise<RunQueryResult<ROW>> {
    const ds = this.ds()
    const [entities, queryResult] = await ds.runQuery(q, dsOpt)

    const rows = entities.map(e => this.mapId<ROW>(e))

    return {
      ...queryResult,
      rows,
    }
  }

  override streamQuery<ROW extends ObjectWithId>(
    dbQuery: DBQuery<ROW>,
    _opt?: DatastoreDBStreamOptions,
  ): Pipeline<ROW> {
    const ds = this.ds()
    const q = dbQueryToDatastoreQuery(dbQuery, ds.createQuery(dbQuery.table))

    const opt = {
      logger: this.cfg.logger,
      ...this.cfg.streamOptions,
      ..._opt,
    }

    const readable = opt.experimentalCursorStream
      ? new DatastoreStreamReadable<ROW>(q, opt)
      : ds.runQueryStream(q, getRunQueryOptions(opt))

    return Pipeline.from<ROW>(readable).mapSync(r => this.mapId<ROW>(r))
  }

  // https://github.com/GoogleCloudPlatform/nodejs-getting-started/blob/master/2-structured-data/books/model-datastore.js

  /**
   * Returns saved entities with generated id/updated/created (non-mutating!)
   */
  override async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rows: ROW[],
    opt: DatastoreDBSaveOptions<ROW> = {},
  ): Promise<void> {
    const ds = this.ds()
    const entities = rows.map(obj => this.toDatastoreEntity(ds, table, obj, opt))

    const method = methodMap[opt.saveMethod || 'upsert'] || 'save'

    const save = pRetryFn(
      async (batch: DatastorePayload<ROW>[]) => {
        await ((opt.tx as DatastoreDBTransaction)?.tx || ds)[method](batch)
      },
      this.getPRetryOptions(`DatastoreLib.saveBatch(${table})`),
    )

    try {
      const chunks = _chunk(entities, MAX_ITEMS)
      if (chunks.length === 1) {
        // Not using pMap in hope to preserve stack trace
        await save(chunks[0]!)
      } else {
        await pMap(chunks, async batch => await save(batch), {
          concurrency: DATASTORE_RECOMMENDED_CONCURRENCY,
        })
      }
    } catch (err) {
      if (err instanceof TimeoutError) {
        _errorDataAppend(err, {
          fingerprint: DATASTORE_TIMEOUT,
        })
      }

      // console.log(`datastore.save ${kind}`, { obj, entity })
      this.cfg.logger.error(
        `error in DatastoreLib.saveBatch for ${table} (${rows.length} rows)`,
        err,
      )

      throw err
    }
  }

  // not implementing multiSaveBatch, since the API does not support passing excludeFromIndexes for multiple tables

  override async deleteByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt: DatastoreDBReadOptions = {},
  ): Promise<number> {
    const idFilter = q._filters.find(f => f.name === 'id')
    if (idFilter) {
      const ids: string[] = idFilter.op === '==' ? [idFilter.val] : idFilter.val
      return await this.deleteByIds(q.table, ids, opt)
    }

    const ds = this.ds()
    const datastoreQuery = dbQueryToDatastoreQuery(q.select([]), ds.createQuery(q.table))
    const dsOpt = getRunQueryOptions(opt)
    const { rows } = await this.runDatastoreQuery<ObjectWithId>(datastoreQuery, dsOpt)
    return await this.deleteByIds(
      q.table,
      rows.map(obj => obj.id),
      opt,
    )
  }

  /**
   * Limitation: Datastore's delete returns void, so we always return all ids here as "deleted"
   * regardless if they were actually deleted or not.
   */
  override async deleteByIds(
    table: string,
    ids: string[],
    opt: DatastoreDBOptions = {},
  ): Promise<number> {
    const ds = this.ds()
    const keys = ids.map(id => this.key(ds, table, id))

    const retryOptions = this.getPRetryOptions(`DatastoreLib.deleteByIds(${table})`)

    await pMap(
      _chunk(keys, MAX_ITEMS),
      // async batch => await doDelete(batch),
      async batchOfKeys => {
        await pRetry(async () => {
          await ((opt.tx as DatastoreDBTransaction)?.tx || ds).delete(batchOfKeys)
        }, retryOptions)
      },
      {
        concurrency: DATASTORE_RECOMMENDED_CONCURRENCY,
      },
    )
    return ids.length
  }

  override async multiDelete(
    map: StringMap<string[]>,
    opt: DatastoreDBOptions = {},
  ): Promise<number> {
    const ds = this.ds()
    const keys: Key[] = []
    for (const [table, ids] of _stringMapEntries(map)) {
      keys.push(...ids.map(id => this.key(ds, table, id)))
    }

    const retryOptions = this.getPRetryOptions(`DatastoreLib.multiDeleteByIds`)

    await pMap(
      _chunk(keys, MAX_ITEMS),
      // async batch => await doDelete(batch),
      async batchOfKeys => {
        await pRetry(async () => {
          await ((opt.tx as DatastoreDBTransaction)?.tx || ds).delete(batchOfKeys)
        }, retryOptions)
      },
      {
        concurrency: DATASTORE_RECOMMENDED_CONCURRENCY,
      },
    )

    return keys.length
  }

  override async createTransaction(
    opt: CommonDBTransactionOptions = {},
  ): Promise<DatastoreDBTransaction> {
    const ds = this.ds()
    const { readOnly } = opt
    const datastoreTx = ds.transaction({
      readOnly,
    })
    await datastoreTx.run()
    return new DatastoreDBTransaction(this, datastoreTx)
  }

  override async runInTransaction(
    fn: DBTransactionFn,
    opt: CommonDBTransactionOptions = {},
  ): Promise<void> {
    const ds = this.ds()
    const { readOnly } = opt
    const datastoreTx = ds.transaction({
      readOnly,
    })

    try {
      await datastoreTx.run()
      const tx = new DatastoreDBTransaction(this, datastoreTx)
      await fn(tx)
      await datastoreTx.commit()
    } catch (err) {
      await this.rollback(datastoreTx)
      throw err
    }
  }

  async getAllStats(): Promise<DatastoreStats[]> {
    const ds = this.ds()
    const q = ds.createQuery('__Stat_Kind__')
    const [statsArray] = await ds.runQuery(q)
    return statsArray || []
  }

  /**
   * Returns undefined e.g when Table is non-existing
   */
  async getStats(table: string): Promise<DatastoreStats | undefined> {
    const ds = this.ds()

    const q = ds
      .createQuery('__Stat_Kind__')
      // .filter('kind_name', table)
      .filter(new PropertyFilter('kind_name', '=', table))
      .limit(1)
    const [statsArray] = await ds.runQuery(q)
    const [stats] = statsArray
    return stats
  }

  async getStatsCount(table: string): Promise<number | undefined> {
    const stats = await this.getStats(table)
    return stats?.count
  }

  async getTableProperties(table: string): Promise<DatastorePropertyStats[]> {
    const ds = this.ds()
    const q = ds
      .createQuery('__Stat_PropertyType_PropertyName_Kind__')
      // .filter('kind_name', table)
      .filter(new PropertyFilter('kind_name', '=', table))
    const [stats] = await ds.runQuery(q)
    return stats
  }

  private mapId<T extends ObjectWithId>(o: any): T {
    if (!o) return o
    const r = {
      ...o,
      id: this.getIdFromKey(this.getDsKey(o)!),
    }
    delete r[this.KEY]
    return r
  }

  private parseDatastoreEntity<T extends ObjectWithId>(entity: any): [kind: string, row: T] {
    const key = this.getDsKey(entity)!
    const { name, kind } = key
    const row: any = {
      ...entity,
      id: name,
    }
    delete row[this.KEY]
    return [kind, row]
  }

  // if key field exists on entity, it will be used as key (prevent to duplication of numeric keyed entities)
  private toDatastoreEntity<T extends ObjectWithId>(
    ds: Datastore,
    kind: string,
    o: T,
    opt: DatastoreDBSaveOptions<T> = {},
  ): DatastorePayload<T> {
    const key = this.getDsKey(o) || this.key(ds, kind, o.id)
    const data = Object.assign({}, o) as any
    delete data.id
    delete data[this.KEY]

    const excludeFromIndexes = opt.indexes
      ? indexesToExcludeFromIndexes(data, opt.indexes)
      : (opt.excludeFromIndexes as string[]) || []

    return {
      key,
      data,
      excludeFromIndexes,
    }
  }

  key(ds: Datastore, kind: string, id: string): Key {
    _assert(id, `Cannot save "${kind}" entity without "id"`)
    return ds.key([kind, id])
  }

  private getDsKey(o: any): Key | undefined {
    return o?.[this.KEY]
  }

  private getIdFromKey(key: Key): string | undefined {
    const id = key.id || key.name
    return id?.toString()
  }

  override async createTable<ROW extends ObjectWithId>(
    _table: string,
    _schema: JsonSchema<ROW>,
  ): Promise<void> {}

  override async getTables(): Promise<string[]> {
    const statsArray = await this.getAllStats()
    // Filter out tables starting with `_` by default (internal Datastore tables)
    return statsArray.map(stats => stats.kind_name).filter(table => table && !table.startsWith('_'))
  }

  override async getTableSchema<ROW extends ObjectWithId>(table: string): Promise<JsonSchema<ROW>> {
    const stats = await this.getTableProperties(table)

    const s: JsonSchema<ROW> = {
      $id: `${table}.schema.json`,
      type: 'object',
      properties: {
        id: { type: 'string' },
      } as any,
      additionalProperties: true,
      required: [],
    }

    stats
      .filter(s => !s.property_name.includes('.') && s.property_name !== 'id') // filter out objectify's "virtual properties"
      .forEach(stats => {
        const { property_type: dtype } = stats
        const name = stats.property_name as keyof ROW

        if (dtype === DatastoreType.Blob) {
          s.properties![name] = {
            instanceof: 'Buffer',
          } as JsonSchema<ROW[typeof name]>
        } else if (dtype === DatastoreType.Text || dtype === DatastoreType.String) {
          s.properties![name] = {
            type: 'string',
          } as JsonSchema<ROW[typeof name]>
        } else if (dtype === DatastoreType.EmbeddedEntity) {
          s.properties![name] = {
            type: 'object',
            additionalProperties: true,
            properties: {} as any,
            required: [],
          } as JsonSchema<ROW[typeof name]>
        } else if (dtype === DatastoreType.Integer) {
          s.properties![name] = {
            type: 'integer',
          } as JsonSchema<ROW[typeof name]>
        } else if (dtype === DatastoreType.Float) {
          s.properties![name] = {
            type: 'number',
          } as JsonSchema<ROW[typeof name]>
        } else if (dtype === DatastoreType.Boolean) {
          s.properties![name] = {
            type: 'boolean',
          } as JsonSchema<ROW[typeof name]>
        } else if (dtype === DatastoreType.DATE_TIME) {
          // Don't know how to map it properly
          s.properties![name] = {} as JsonSchema<any>
        } else if (dtype === DatastoreType.NULL) {
          // check, maybe we can just skip this type and do nothing?
          s.properties![name] ||= {
            type: 'null',
          } as JsonSchema<ROW[typeof name]>
        } else {
          throw new Error(
            `Unknown Datastore Type '${stats.property_type}' for ${table}.${name as string}`,
          )
        }
      })

    return s
  }

  private getPRetryOptions(name: string): PRetryOptions {
    return {
      predicate: err => RETRY_ON.some(s => err?.message?.toLowerCase()?.includes(s)),
      name,
      timeout: 20_000,
      maxAttempts: 5,
      delay: 5000,
      delayMultiplier: 1.5,
      logFirstAttempt: false,
      logFailures: true,
      // logAll: true,
      logger: this.cfg.logger,
      // not appending fingerprint here, otherwise it would just group all kinds of errors, not just Timeout errors
      // errorData: {
      //   fingerprint: DATASTORE_TIMEOUT,
      // },
    }
  }

  /**
   * Silently rollback the transaction.
   * It may happen that transaction is already committed/rolled back, so we don't want to throw an error here.
   */
  private async rollback(datastoreTx: Transaction): Promise<void> {
    try {
      await datastoreTx.rollback()
    } catch (err) {
      // log the error, but don't re-throw, as this should be a graceful rollback
      this.cfg.logger.error(err)
    }
  }
}

/**
 * https://cloud.google.com/datastore/docs/concepts/transactions#datastore-datastore-transactional-update-nodejs
 */
export class DatastoreDBTransaction implements DBTransaction {
  constructor(
    public db: DatastoreDB,
    public tx: Transaction,
  ) {}

  async commit(): Promise<void> {
    await this.tx.commit()
  }

  async rollback(): Promise<void> {
    try {
      await this.tx.rollback()
    } catch (err) {
      // log the error, but don't re-throw, as this should be a graceful rollback
      this.db.cfg.logger.error(err)
    }
  }

  async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: string[],
    opt?: CommonDBReadOptions,
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

function idComparator<T extends ObjectWithId>(a: T, b: T): number {
  return a.id > b.id ? 1 : a.id < b.id ? -1 : 0
}

/**
 * Derives `excludeFromIndexes` from an inclusion list of indexed properties + the actual data.
 * Walks the data object and collects all property paths that are NOT in the `indexes` list.
 */
export function indexesToExcludeFromIndexes(
  data: Record<string, unknown>,
  indexes: string[],
): string[] {
  const result: string[] = []
  walk(data, '', result, indexes)
  return result
}

function walk(
  data: Record<string, unknown>,
  prefix: string,
  result: string[],
  indexes: string[],
): void {
  for (const key of Object.keys(data)) {
    const fullPath = prefix ? `${prefix}.${key}` : key

    // This property is indexed — skip it entirely
    if (indexes.includes(fullPath)) continue

    const value = data[key]

    const obj = asObject(value)
    if (obj) {
      // Check if any index targets a sub-property of this path
      const pfx = `${fullPath}.`
      if (indexes.some(idx => idx.startsWith(pfx))) {
        // Recurse into the object to exclude only non-indexed sub-properties
        walk(obj, fullPath, result, indexes)
      } else {
        // No sub-property is indexed — exclude the whole subtree
        result.push(fullPath, `${fullPath}.*`)
      }
    } else {
      // Primitive, null, undefined, array of primitives — exclude
      result.push(fullPath)
    }
  }
}

/**
 * Returns the object to recurse into, or undefined if the value is primitive.
 * For arrays of objects, returns the first element (Datastore embeds array elements
 * with the same property paths as a single object, e.g. `items.sku`).
 */
function asObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null
  ) {
    return value[0] as Record<string, unknown>
  }
  return undefined
}
