import { Readable } from 'node:stream'
import { _isEmptyObject } from '@naturalcycles/js-lib'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import {
  generateJsonSchemaFromData,
  type JsonSchemaObject,
  type JsonSchemaRootObject,
} from '@naturalcycles/js-lib/json-schema'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { _deepCopy, _sortObjectDeep } from '@naturalcycles/js-lib/object'
import {
  _stringMapEntries,
  _stringMapValues,
  type AnyObjectWithId,
  type ObjectWithId,
  type StringMap,
} from '@naturalcycles/js-lib/types'
import { bufferReviver } from '@naturalcycles/nodejs-lib/stream/ndjson/transformJsonParse.js'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib/stream/stream.model.js'
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

export interface InMemoryDBCfg {
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
   * Defaults to `console`.
   */
  logger?: CommonLogger
}

export class InMemoryDB implements CommonDB {
  dbType = CommonDBType.document

  support: CommonDBSupport = {
    ...commonDBFullSupport,
    timeMachine: false,
  }

  constructor(cfg?: Partial<InMemoryDBCfg>) {
    this.cfg = {
      // defaults
      tablesPrefix: '',
      forbidTransactionReadAfterWrite: true,
      logger: console,
      ...cfg,
    }
  }

  cfg: InMemoryDBCfg

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
}

export class InMemoryDBTransaction implements DBTransaction {
  constructor(
    private db: InMemoryDB,
    private opt: Required<CommonDBTransactionOptions>,
  ) {}

  ops: DBOperation[] = []

  // used to enforce forbidReadAfterWrite setting
  writeOperationHappened = false

  async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: string[],
    opt?: CommonDBOptions,
  ): Promise<ROW[]> {
    if (this.db.cfg.forbidTransactionReadAfterWrite) {
      _assert(
        !this.writeOperationHappened,
        `InMemoryDBTransaction: read operation attempted after write operation`,
      )
    }

    return await this.db.getByIds(table, ids, opt)
  }

  async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rows: ROW[],
    opt?: CommonDBSaveOptions<ROW>,
  ): Promise<void> {
    _assert(
      !this.opt.readOnly,
      `InMemoryDBTransaction: saveBatch(${table}) called in readOnly mode`,
    )

    this.writeOperationHappened = true

    this.ops.push({
      type: 'saveBatch',
      table,
      rows,
      opt,
    })
  }

  async deleteByIds(table: string, ids: string[], opt?: CommonDBOptions): Promise<number> {
    _assert(
      !this.opt.readOnly,
      `InMemoryDBTransaction: deleteByIds(${table}) called in readOnly mode`,
    )

    this.writeOperationHappened = true

    this.ops.push({
      type: 'deleteByIds',
      table,
      ids,
      opt,
    })
    return ids.length
  }

  async commit(): Promise<void> {
    const backup = _deepCopy(this.db.data)

    try {
      for (const op of this.ops) {
        if (op.type === 'saveBatch') {
          await this.db.saveBatch(op.table, op.rows, op.opt)
        } else if (op.type === 'deleteByIds') {
          await this.db.deleteByIds(op.table, op.ids, op.opt)
        } else {
          throw new Error(`DBOperation not supported: ${(op as any).type}`)
        }
      }

      this.ops = []
    } catch (err) {
      // rollback
      this.ops = []
      this.db.data = backup
      this.db.cfg.logger!.log('InMemoryDB transaction rolled back')

      throw err
    }
  }

  async rollback(): Promise<void> {
    this.ops = []
  }
}
