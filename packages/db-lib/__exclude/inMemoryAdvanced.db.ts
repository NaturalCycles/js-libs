import { createReadStreamAsNDJSON } from '@naturalcycles/nodejs-lib/stream/ndjson/createReadStreamAsNDJSON.js'
import { createWriteStreamAsNDJSON } from '@naturalcycles/nodejs-lib/stream/ndjson/createWriteStreamAsNDJSON.js'
import { bufferReviver } from '@naturalcycles/nodejs-lib/stream/ndjson/transformJsonParse.js'
import { _pipeline } from '@naturalcycles/nodejs-lib/stream/pipeline/pipeline.js'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib/stream/stream.model.js'
import { Readable } from 'node:stream'
import { _isEmptyObject } from '@naturalcycles/js-lib'
import { _by } from '@naturalcycles/js-lib/array/array.util.js'
import { _since, localTime } from '@naturalcycles/js-lib/datetime'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import {
  generateJsonSchemaFromData,
  type JsonSchemaObject,
  type JsonSchemaRootObject,
} from '@naturalcycles/js-lib/json-schema'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { _deepCopy, _sortObjectDeep } from '@naturalcycles/js-lib/object'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import {
  _stringMapEntries,
  _stringMapValues,
  type AnyObjectWithId,
  type ObjectWithId,
  type StringMap,
} from '@naturalcycles/js-lib/types'
import { dimGrey, yellow } from '@naturalcycles/nodejs-lib/colors'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'

import type { CommonDB, CommonDBSupport } from '../commondb/common.db.js'
import { commonDBFullSupport, CommonDBType } from '../commondb/common.db.js'
import type {
  CommonDBCreateOptions,
  CommonDBOptions,
  CommonDBSaveOptions,
  CommonDBTransactionOptions,
  DBOperation,
  DBTransaction,
  DBTransactionFn,
  RunQueryResult,
} from '../db.model.js'
import type { DBQuery } from '../query/dbQuery.js'
import { queryInMemory } from './queryInMemory.js'

export interface InMemoryAdvancedDBCfg {
  /**
   * @default ''
   *
   * Allows to support "Namespacing".
   * E.g, pass `ns1_` to it and all tables will be prefixed by it.
   * Reset cache respects this prefix (won't touch other namespaces!)
   */
  tablesPrefix: string

  /**
   * Many DB implementations (e.g Datastore and Firestore) forbid doing
   * read operations after a write/delete operation was done inside a Transaction.
   *
   * To help spot that type of bug - InMemoryDB by default has this setting to `true`,
   * which will throw on such occasions.
   *
   * Defaults to true.
   */
  forbidTransactionReadAfterWrite?: boolean

  /**
   * @default false
   *
   * Set to true to enable disk persistence (!).
   */
  persistenceEnabled: boolean

  /**
   * @default ./tmp/inmemorydb.ndjson.gz
   *
   * Will store one ndjson file per table.
   * Will only flush on demand (see .flushToDisk() and .restoreFromDisk() methods).
   * Even if persistence is enabled - nothing is flushed or restored automatically.
   */
  persistentStoragePath: string

  /**
   * @default true
   */
  persistZip: boolean

  /**
   * Defaults to `console`.
   */
  logger?: CommonLogger
}

export class InMemoryAdvancedDB implements CommonDB {
  dbType = CommonDBType.document

  support: CommonDBSupport = {
    ...commonDBFullSupport,
    timeMachine: false,
  }

  constructor(cfg?: Partial<InMemoryAdvancedDBCfg>) {
    this.cfg = {
      // defaults
      tablesPrefix: '',
      forbidTransactionReadAfterWrite: true,
      persistenceEnabled: false,
      persistZip: true,
      persistentStoragePath: './tmp/inmemorydb',
      logger: console,
      ...cfg,
    }
  }

  cfg: InMemoryAdvancedDBCfg

  // data[table][id] > {id: 'a', created: ... }
  data: StringMap<StringMap<AnyObjectWithId>> = {}

  /**
   * Returns internal "Data snapshot".
   * Deterministic - jsonSorted.
   */
  getDataSnapshot(): StringMap<StringMap<ObjectWithId>> {
    return _sortObjectDeep(this.data)
  }

  async ping(): Promise<void> {}

  /**
   * Resets InMemory DB data
   */
  async resetCache(_table?: string): Promise<void> {
    if (_table) {
      const table = this.cfg.tablesPrefix + _table
      this.cfg.logger!.log(`reset ${table}`)
      this.data[table] = {}
    } else {
      ;(await this.getTables()).forEach(table => {
        this.data[table] = {}
      })
      this.cfg.logger!.log('reset')
    }
  }

  async getTables(): Promise<string[]> {
    return Object.keys(this.data).filter(t => t.startsWith(this.cfg.tablesPrefix))
  }

  async getTableSchema<ROW extends ObjectWithId>(
    _table: string,
  ): Promise<JsonSchemaRootObject<ROW>> {
    const table = this.cfg.tablesPrefix + _table
    return {
      ...generateJsonSchemaFromData(_stringMapValues(this.data[table] || {})),
      $id: `${table}.schema.json`,
    }
  }

  async createTable<ROW extends ObjectWithId>(
    _table: string,
    _schema: JsonSchemaObject<ROW>,
    opt: CommonDBCreateOptions = {},
  ): Promise<void> {
    const table = this.cfg.tablesPrefix + _table
    if (opt.dropIfExists) {
      this.data[table] = {}
    } else {
      this.data[table] ||= {}
    }
  }

  async getByIds<ROW extends ObjectWithId>(
    _table: string,
    ids: string[],
    _opt?: CommonDBOptions,
  ): Promise<ROW[]> {
    const table = this.cfg.tablesPrefix + _table
    this.data[table] ||= {}
    return ids.map(id => this.data[table]![id] as ROW).filter(Boolean)
  }

  async saveBatch<ROW extends ObjectWithId>(
    _table: string,
    rows: ROW[],
    opt: CommonDBSaveOptions<ROW> = {},
  ): Promise<void> {
    const table = this.cfg.tablesPrefix + _table
    this.data[table] ||= {}

    rows.forEach(r => {
      if (!r.id) {
        this.cfg.logger!.warn({ rows })
        throw new Error(
          `InMemoryDB doesn't support id auto-generation in saveBatch, row without id was given`,
        )
      }

      if (opt.saveMethod === 'insert' && this.data[table]![r.id]) {
        throw new Error(`InMemoryDB: INSERT failed, entity exists: ${table}.${r.id}`)
      }

      if (opt.saveMethod === 'update' && !this.data[table]![r.id]) {
        throw new Error(`InMemoryDB: UPDATE failed, entity doesn't exist: ${table}.${r.id}`)
      }

      // JSON parse/stringify (deep clone) is to:
      // 1. Not store values "by reference" (avoid mutation bugs)
      // 2. Simulate real DB that would do something like that in a transport layer anyway
      this.data[table]![r.id] = JSON.parse(JSON.stringify(r), bufferReviver)
    })
  }

  async deleteByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<number> {
    const table = this.cfg.tablesPrefix + q.table
    if (!this.data[table]) return 0
    const ids = queryInMemory(q, Object.values(this.data[table]) as ROW[]).map(r => r.id)
    return await this.deleteByIds(q.table, ids)
  }

  async deleteByIds(_table: string, ids: string[], _opt?: CommonDBOptions): Promise<number> {
    const table = this.cfg.tablesPrefix + _table
    if (!this.data[table]) return 0

    let count = 0
    ids.forEach(id => {
      if (!this.data[table]![id]) return
      delete this.data[table]![id]
      count++
    })

    return count
  }

  async patchByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    patch: Partial<ROW>,
  ): Promise<number> {
    if (_isEmptyObject(patch)) return 0
    const table = this.cfg.tablesPrefix + q.table
    const rows = queryInMemory(q, Object.values(this.data[table] || {}) as ROW[])
    rows.forEach(row => Object.assign(row, patch))
    return rows.length
  }

  async runQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<RunQueryResult<ROW>> {
    const table = this.cfg.tablesPrefix + q.table
    return { rows: queryInMemory(q, Object.values(this.data[table] || {}) as ROW[]) }
  }

  async runQueryCount<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<number> {
    const table = this.cfg.tablesPrefix + q.table
    return queryInMemory<any>(q, Object.values(this.data[table] || {})).length
  }

  streamQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: CommonDBOptions,
  ): ReadableTyped<ROW> {
    const table = this.cfg.tablesPrefix + q.table
    return Readable.from(queryInMemory(q, Object.values(this.data[table] || {}) as ROW[]))
  }

  async runInTransaction(fn: DBTransactionFn, opt: CommonDBTransactionOptions = {}): Promise<void> {
    const tx = new InMemoryDBTransaction(this, {
      readOnly: false,
      ...opt,
    })

    try {
      await fn(tx)
      await tx.commit()
    } catch (err) {
      await tx.rollback()
      throw err
    }
  }

  async createTransaction(opt: CommonDBTransactionOptions = {}): Promise<DBTransaction> {
    return new InMemoryDBTransaction(this, {
      readOnly: false,
      ...opt,
    })
  }

  async incrementBatch(
    table: string,
    prop: string,
    incrementMap: StringMap<number>,
    _opt?: CommonDBOptions,
  ): Promise<StringMap<number>> {
    const tbl = this.cfg.tablesPrefix + table
    this.data[tbl] ||= {}

    const result: StringMap<number> = {}

    for (const [id, by] of _stringMapEntries(incrementMap)) {
      this.data[tbl][id] ||= { id }
      const newValue = ((this.data[tbl][id][prop] as number) || 0) + by
      this.data[tbl][id][prop] = newValue
      result[id] = newValue
    }

    return result
  }

  /**
   * Flushes all tables (all namespaces) at once.
   */
  async flushToDisk(): Promise<void> {
    _assert(this.cfg.persistenceEnabled, 'flushToDisk() called but persistenceEnabled=false')
    const { persistentStoragePath, persistZip } = this.cfg

    const started = localTime.nowUnixMillis()

    await fs2.emptyDirAsync(persistentStoragePath)

    let tables = 0

    // infinite concurrency for now
    await pMap(Object.keys(this.data), async table => {
      const rows = Object.values(this.data[table]!)
      if (rows.length === 0) return // 0 rows

      tables++
      const fname = `${persistentStoragePath}/${table}.ndjson${persistZip ? '.gz' : ''}`

      await _pipeline([Readable.from(rows), ...createWriteStreamAsNDJSON(fname)])
    })

    this.cfg.logger!.log(
      `flushToDisk took ${dimGrey(_since(started))} to save ${yellow(tables)} tables`,
    )
  }

  /**
   * Restores all tables (all namespaces) at once.
   */
  async restoreFromDisk(): Promise<void> {
    _assert(this.cfg.persistenceEnabled, 'restoreFromDisk() called but persistenceEnabled=false')
    const { persistentStoragePath } = this.cfg

    const started = localTime.nowUnixMillis()

    await fs2.ensureDirAsync(persistentStoragePath)

    this.data = {} // empty it in the beginning!

    const files = (await fs2.readdirAsync(persistentStoragePath)).filter(f => f.includes('.ndjson'))

    // infinite concurrency for now
    await pMap(files, async file => {
      const fname = `${persistentStoragePath}/${file}`
      const table = file.split('.ndjson')[0]!

      const rows = await createReadStreamAsNDJSON(fname).toArray()

      this.data[table] = _by(rows, r => r.id)
    })

    this.cfg.logger!.log(
      `restoreFromDisk took ${dimGrey(_since(started))} to read ${yellow(files.length)} tables`,
    )
  }
}
