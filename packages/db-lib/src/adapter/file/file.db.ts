import type { JsonSchemaRootObject, ObjectWithId, UnixTimestampMillis } from '@naturalcycles/js-lib'
import {
  _assert,
  _by,
  _deepEquals,
  _filterUndefinedValues,
  _since,
  _sortBy,
  _sortObjectDeep,
  _stringMapValues,
  generateJsonSchemaFromData,
  localTime,
} from '@naturalcycles/js-lib'
import { dimGrey } from '@naturalcycles/nodejs-lib/colors'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib/stream'
import { readableCreate } from '@naturalcycles/nodejs-lib/stream'
import { BaseCommonDB } from '../../base.common.db.js'
import type { CommonDB, CommonDBSupport } from '../../common.db.js'
import { commonDBFullSupport } from '../../common.db.js'
import type {
  CommonDBOptions,
  CommonDBSaveOptions,
  CommonDBStreamOptions,
  DBSaveBatchOperation,
  RunQueryResult,
} from '../../db.model.js'
import type { DBQuery } from '../../query/dbQuery.js'
import { queryInMemory } from '../inmemory/queryInMemory.js'
import type { FileDBCfg } from './file.db.model.js'

/**
 * Provides barebone implementation for "whole file" based CommonDB.
 * "whole file" means that the persistence layer doesn't allow any querying,
 * but allows to read the whole file or save the whole file.
 * For example, Google Cloud Storage / S3 that store ndjson files will be such persistence.
 *
 * In contrast with InMemoryDB, FileDB stores *nothing* in memory.
 * Each load/query operation loads *whole* file from the persitence layer.
 * Each save operation saves *whole* file to the persistence layer.
 */
export class FileDB extends BaseCommonDB implements CommonDB {
  override support: CommonDBSupport = {
    ...commonDBFullSupport,
    bufferValues: false, // todo: implement
    insertSaveMethod: false,
    updateSaveMethod: false,
    patchByQuery: false,
    createTable: false,
    transactions: false, // todo
    increment: false,
  }

  constructor(cfg: FileDBCfg) {
    super()
    this.cfg = {
      sortObjects: true,
      logFinished: true,
      logger: console,
      ...cfg,
    }
  }

  cfg!: FileDBCfg

  override async ping(): Promise<void> {
    await this.cfg.plugin.ping()
  }

  override async getTables(): Promise<string[]> {
    const started = this.logStarted('getTables()')
    const tables = await this.cfg.plugin.getTables()
    this.logFinished(started, `getTables() ${tables.length} tables`)
    return tables
  }

  override async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: string[],
    _opt?: CommonDBOptions,
  ): Promise<ROW[]> {
    const byId = _by(await this.loadFile<ROW>(table), r => r.id)
    return ids.map(id => byId[id]!).filter(Boolean)
  }

  override async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rows: ROW[],
    _opt?: CommonDBSaveOptions<ROW>,
  ): Promise<void> {
    if (!rows.length) return // save some api calls

    // 1. Load the whole file
    const byId = _by(await this.loadFile<ROW>(table), r => r.id)

    // 2. Merge with new data (using ids)
    let saved = 0
    rows.forEach(r => {
      _assert(r.id, 'FileDB: row.id is required')

      if (!_deepEquals(byId[r.id], r)) {
        byId[r.id] = r as any
        saved++
      }
    })

    // Only save if there are changed rows
    if (saved > 0) {
      // 3. Save the whole file
      await this.saveFile(table, _stringMapValues(byId))
    }
  }

  override async runQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<RunQueryResult<ROW>> {
    return {
      rows: queryInMemory(q, await this.loadFile<ROW>(q.table)),
    }
  }

  override async runQueryCount<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<number> {
    return (await this.loadFile(q.table)).length
  }

  override streamQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt?: CommonDBStreamOptions,
  ): ReadableTyped<ROW> {
    const readable = readableCreate<ROW>()

    void this.runQuery(q, opt).then(({ rows }) => {
      rows.forEach(r => readable.push(r))
      readable.push(null) // done
    })

    return readable
  }

  override async deleteByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<number> {
    const byId = _by(await this.loadFile<ROW>(q.table), r => r.id)

    let deleted = 0
    queryInMemory(q, _stringMapValues(byId)).forEach(r => {
      delete byId[r.id]
      deleted++
    })

    if (deleted > 0) {
      await this.saveFile(q.table, _stringMapValues(byId))
    }

    return deleted
  }

  override async deleteByIds(
    table: string,
    ids: string[],
    _opt?: CommonDBOptions,
  ): Promise<number> {
    const byId = _by(await this.loadFile(table), r => r.id)

    let deleted = 0
    ids.forEach(id => {
      if (!byId[id]) return
      delete byId[id]
      deleted++
    })

    if (deleted > 0) {
      await this.saveFile(table, _stringMapValues(byId))
    }

    return deleted
  }

  override async getTableSchema<ROW extends ObjectWithId>(
    table: string,
  ): Promise<JsonSchemaRootObject<ROW>> {
    const rows = await this.loadFile(table)
    return {
      ...generateJsonSchemaFromData(rows),
      $id: `${table}.schema.json`,
    }
  }

  // wrapper, to handle logging
  async loadFile<ROW extends ObjectWithId>(table: string): Promise<ROW[]> {
    const started = this.logStarted(`loadFile(${table})`)
    const rows = await this.cfg.plugin.loadFile<ROW>(table)
    this.logFinished(started, `loadFile(${table}) ${rows.length} row(s)`)
    return rows
  }

  // wrapper, to handle logging, sorting rows before saving
  async saveFile<ROW extends ObjectWithId>(table: string, _rows: ROW[]): Promise<void> {
    // if (!_rows.length) return // NO, it should be able to save file with 0 rows!

    // Sort the rows, if needed
    const rows = this.sortRows(_rows)

    const op = `saveFile(${table}) ${rows.length} row(s)`
    const started = this.logStarted(op)
    await this.cfg.plugin.saveFiles([{ type: 'saveBatch', table, rows }])
    this.logFinished(started, op)
  }

  async saveFiles<ROW extends ObjectWithId>(ops: DBSaveBatchOperation<ROW>[]): Promise<void> {
    if (!ops.length) return
    const op =
      `saveFiles ${ops.length} op(s):\n` + ops.map(o => `${o.table} (${o.rows.length})`).join('\n')
    const started = this.logStarted(op)
    await this.cfg.plugin.saveFiles(ops)
    this.logFinished(started, op)
  }

  // override async createTransaction(): Promise<FileDBTransaction> {
  //   return new FileDBTransaction(this)
  // }

  sortRows<ROW extends ObjectWithId>(rows: ROW[]): ROW[] {
    rows = rows.map(r => _filterUndefinedValues(r))

    if (this.cfg.sortOnSave) {
      _sortBy(rows, r => r[this.cfg.sortOnSave!.name as keyof ROW] as string, { mutate: true })
      if (this.cfg.sortOnSave.descending) rows.reverse() // mutates
    }

    if (this.cfg.sortObjects) {
      return _sortObjectDeep(rows)
    }

    return rows
  }

  private logStarted(op: string): UnixTimestampMillis {
    if (this.cfg.logStarted) {
      this.cfg.logger?.log(`>> ${op}`)
    }
    return localTime.nowUnixMillis()
  }

  private logFinished(started: UnixTimestampMillis, op: string): void {
    if (!this.cfg.logFinished) return
    this.cfg.logger?.log(`<< ${op} ${dimGrey(`in ${_since(started)}`)}`)
  }
}

// todo: get back and fix it
// Implementation is optimized for loading/saving _whole files_.
/*
export class FileDBTransaction implements DBTransaction {
  constructor(private db: FileDB) {}

  ops: DBOperation[] = []

  async commit(): Promise<void> {
    // data[table][id] => row
    const data: StringMap<StringMap<ObjectWithId>> = {}

    // 1. Load all tables data (concurrently)
    const tables = _uniq(this.ops.map(o => o.table))

    await pMap(
      tables,
      async table => {
        const rows = await this.db.loadFile(table)
        data[table] = _by(rows, r => r.id)
      },
      { concurrency: 16 },
    )

    const backup = _deepCopy(data)

    // 2. Apply ops one by one (in order)
    this.ops.forEach(op => {
      if (op.type === 'deleteByIds') {
        op.ids.forEach(id => delete data[op.table]![id])
      } else if (op.type === 'saveBatch') {
        op.rows.forEach(r => {
          if (!r.id) {
            throw new Error('FileDB: row has an empty id')
          }
          data[op.table]![r.id] = r
        })
      } else {
        throw new Error(`DBOperation not supported: ${(op as any).type}`)
      }
    })

    // 3. Sort, turn it into ops
    // Not filtering empty arrays, cause it's already filtered in this.saveFiles()
    const ops: DBSaveBatchOperation[] = _stringMapEntries(data).map(([table, map]) => {
      return {
        type: 'saveBatch',
        table,
        rows: this.db.sortRows(_stringMapValues(map)),
      }
    })

    // 4. Save all files
    try {
      await this.db.saveFiles(ops)
    } catch (err) {
      const ops: DBSaveBatchOperation[] = _stringMapEntries(backup).map(([table, map]) => {
        return {
          type: 'saveBatch',
          table,
          rows: this.db.sortRows(_stringMapValues(map)),
        }
      })

      // Rollback, ignore rollback error (if any)
      await this.db.saveFiles(ops).catch(_ => {})

      throw err
    }
  }

  async rollback(): Promise<void> {
    this.ops = []
  }
}
*/
