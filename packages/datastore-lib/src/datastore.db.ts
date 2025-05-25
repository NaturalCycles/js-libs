import { Transform } from 'node:stream'
import type { Datastore, Key, PropertyFilter, Query, Transaction } from '@google-cloud/datastore'
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
import type {
  CommonLogger,
  JsonSchemaAny,
  JsonSchemaBoolean,
  JsonSchemaNull,
  JsonSchemaNumber,
  JsonSchemaObject,
  JsonSchemaRootObject,
  JsonSchemaString,
  ObjectWithId,
  PRetryOptions,
} from '@naturalcycles/js-lib'
import {
  _assert,
  _chunk,
  _errorDataAppend,
  _omit,
  commonLoggerMinLevel,
  pMap,
  pRetry,
  pRetryFn,
  pTimeout,
  TimeoutError,
} from '@naturalcycles/js-lib'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib'
import { boldWhite } from '@naturalcycles/nodejs-lib'
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
import { DatastoreStreamReadable } from './DatastoreStreamReadable.js'
import { dbQueryToDatastoreQuery } from './query.util.js'

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
  async ds(): Promise<Datastore> {
    if (!this.cachedDatastore) {
      _assert(
        process.env['APP_ENV'] !== 'test',
        'DatastoreDB cannot be used in Test env, please use InMemoryDB',
      )

      const DS = (await this.getDatastoreLib()).Datastore as typeof Datastore
      this.cfg.projectId ||= this.cfg.credentials?.project_id || process.env['GOOGLE_CLOUD_PROJECT']

      if (this.cfg.projectId) {
        this.cfg.logger.log(`DatastoreDB connected to ${boldWhite(this.cfg.projectId)}`)
      } else if (process.env['GOOGLE_APPLICATION_CREDENTIALS']) {
        this.cfg.logger.log(`DatastoreDB connected via GOOGLE_APPLICATION_CREDENTIALS`)
      }

      if (this.cfg.grpc) {
        this.cfg.logger.log('!!! DatastoreDB using custom grpc !!!')
      }

      this.cachedDatastore = new DS(this.cfg)
      this.KEY = this.cachedDatastore.KEY
    }

    return this.cachedDatastore
  }

  private async getPropertyFilter(): Promise<typeof PropertyFilter> {
    return (await this.getDatastoreLib()).PropertyFilter
  }

  private async getDatastoreLib(): Promise<any> {
    // Lazy-loading
    const lib = await import('@google-cloud/datastore')
    return lib
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
    let ds = await this.ds()
    const keys = ids.map(id => this.key(ds, table, id))
    let rows: any[]

    const dsOpt = this.getRunQueryOptions(opt)

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

        this.cfg.logger.log('datastore recreated on error')

        // This is to debug "GCP Datastore Timeout issue"
        const datastoreLib = await this.getDatastoreLib()
        const DS = datastoreLib.Datastore as typeof Datastore
        ds = this.cachedDatastore = new DS(this.cfg)

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
              fingerprint: [DATASTORE_TIMEOUT],
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
        .sort((a, b) => (a.id > b.id ? 1 : -1))
    )
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

    const ds = await this.ds()
    const q = dbQueryToDatastoreQuery(
      dbQuery,
      ds.createQuery(dbQuery.table),
      await this.getPropertyFilter(),
    )
    const dsOpt = this.getRunQueryOptions(opt)
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
    const ds = await this.ds()
    const q = dbQueryToDatastoreQuery(
      dbQuery.select([]),
      ds.createQuery(dbQuery.table),
      await this.getPropertyFilter(),
    )
    const aq = ds.createAggregationQuery(q).count('count')
    const dsOpt = this.getRunQueryOptions(opt)
    const [entities] = await ds.runAggregationQuery(aq, dsOpt)
    return entities[0]?.count
  }

  private async runDatastoreQuery<ROW extends ObjectWithId>(
    q: Query,
    dsOpt: RunQueryOptions,
  ): Promise<RunQueryResult<ROW>> {
    const ds = await this.ds()
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
  ): ReadableTyped<ROW> {
    const transform = new Transform({
      objectMode: true,
      transform: (chunk, _, cb) => {
        cb(null, this.mapId(chunk))
      },
    })

    void this.ds().then(async ds => {
      const q = dbQueryToDatastoreQuery(
        dbQuery,
        ds.createQuery(dbQuery.table),
        await this.getPropertyFilter(),
      )

      const opt = {
        ...this.cfg.streamOptions,
        ..._opt,
      }

      ;(opt.experimentalCursorStream
        ? new DatastoreStreamReadable<ROW>(
            q,
            opt,
            commonLoggerMinLevel(this.cfg.logger, opt.debug ? 'log' : 'warn'),
          )
        : (ds.runQueryStream(q, this.getRunQueryOptions(opt)) as ReadableTyped<ROW>)
      )
        .on('error', err => transform.emit('error', err))
        .pipe(transform)
    })

    return transform
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
    const ds = await this.ds()
    const entities = rows.map(obj =>
      this.toDatastoreEntity(ds, table, obj, opt.excludeFromIndexes as string[]),
    )

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
          fingerprint: [DATASTORE_TIMEOUT],
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

  override async deleteByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt: DatastoreDBReadOptions = {},
  ): Promise<number> {
    const idFilter = q._filters.find(f => f.name === 'id')
    if (idFilter) {
      const ids: string[] = idFilter.op === '==' ? [idFilter.val] : idFilter.val
      return await this.deleteByIds(q.table, ids, opt)
    }

    const ds = await this.ds()
    const datastoreQuery = dbQueryToDatastoreQuery(
      q.select([]),
      ds.createQuery(q.table),
      await this.getPropertyFilter(),
    )
    const dsOpt = this.getRunQueryOptions(opt)
    const { rows } = await this.runDatastoreQuery<ROW>(datastoreQuery, dsOpt)
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
    const ds = await this.ds()
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

  override async createTransaction(
    opt: CommonDBTransactionOptions = {},
  ): Promise<DatastoreDBTransaction> {
    const ds = await this.ds()
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
    const ds = await this.ds()
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
    const ds = await this.ds()
    const q = ds.createQuery('__Stat_Kind__')
    const [statsArray] = await ds.runQuery(q)
    return statsArray || []
  }

  /**
   * Returns undefined e.g when Table is non-existing
   */
  async getStats(table: string): Promise<DatastoreStats | undefined> {
    const ds = await this.ds()
    const propertyFilter = await this.getPropertyFilter()

    const q = ds
      .createQuery('__Stat_Kind__')
      // .filter('kind_name', table)
      .filter(new propertyFilter('kind_name', '=', table))
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
    const ds = await this.ds()
    const q = ds
      .createQuery('__Stat_PropertyType_PropertyName_Kind__')
      // .filter('kind_name', table)
      .filter(new (await this.getPropertyFilter())('kind_name', '=', table))
    const [stats] = await ds.runQuery(q)
    return stats
  }

  private mapId<T extends ObjectWithId>(o: any, preserveKey = false): T {
    if (!o) return o
    const r = {
      ...o,
      id: this.getKey(this.getDsKey(o)!),
    }
    if (!preserveKey) delete r[this.KEY]
    return r
  }

  // if key field exists on entity, it will be used as key (prevent to duplication of numeric keyed entities)
  private toDatastoreEntity<T extends ObjectWithId>(
    ds: Datastore,
    kind: string,
    o: T,
    excludeFromIndexes: string[] = [],
  ): DatastorePayload<T> {
    const key = this.getDsKey(o) || this.key(ds, kind, o.id)
    const data = Object.assign({}, o) as any
    delete data.id
    delete data[this.KEY]

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

  getKey(key: Key): string | undefined {
    const id = key.id || key.name
    return id?.toString()
  }

  override async createTable<ROW extends ObjectWithId>(
    _table: string,
    _schema: JsonSchemaObject<ROW>,
  ): Promise<void> {}

  override async getTables(): Promise<string[]> {
    const statsArray = await this.getAllStats()
    // Filter out tables starting with `_` by default (internal Datastore tables)
    return statsArray.map(stats => stats.kind_name).filter(table => table && !table.startsWith('_'))
  }

  override async getTableSchema<ROW extends ObjectWithId>(
    table: string,
  ): Promise<JsonSchemaRootObject<ROW>> {
    const stats = await this.getTableProperties(table)

    const s: JsonSchemaRootObject<ROW> = {
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
          s.properties[name] = {
            instanceof: 'Buffer',
          } as JsonSchemaAny
        } else if (dtype === DatastoreType.Text || dtype === DatastoreType.String) {
          s.properties[name] = {
            type: 'string',
          } as JsonSchemaString
        } else if (dtype === DatastoreType.EmbeddedEntity) {
          s.properties[name] = {
            type: 'object',
            additionalProperties: true,
            properties: {},
            required: [],
          } as JsonSchemaObject
        } else if (dtype === DatastoreType.Integer) {
          s.properties[name] = {
            type: 'integer',
          } as JsonSchemaNumber
        } else if (dtype === DatastoreType.Float) {
          s.properties[name] = {
            type: 'number',
          } as JsonSchemaNumber
        } else if (dtype === DatastoreType.Boolean) {
          s.properties[name] = {
            type: 'boolean',
          } as JsonSchemaBoolean
        } else if (dtype === DatastoreType.DATE_TIME) {
          // Don't know how to map it properly
          s.properties[name] = {} as JsonSchemaAny
        } else if (dtype === DatastoreType.NULL) {
          // check, maybe we can just skip this type and do nothing?
          s.properties[name] ||= {
            type: 'null',
          } as JsonSchemaNull
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
      //   fingerprint: [DATASTORE_TIMEOUT],
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

  private getRunQueryOptions(opt: DatastoreDBReadOptions): RunQueryOptions {
    if (!opt.readAt) return {}

    return {
      // Datastore expects UnixTimestamp in milliseconds
      readTime: opt.readAt * 1000,
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
