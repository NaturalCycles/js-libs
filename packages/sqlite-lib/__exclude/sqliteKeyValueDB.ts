import type { CommonDBCreateOptions } from '@naturalcycles/db-lib'
import type { CommonKeyValueDB, IncrementTuple, KeyValueDBTuple } from '@naturalcycles/db-lib/kv'
import { commonKeyValueDBFullSupport } from '@naturalcycles/db-lib/kv'
import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import { boldWhite } from '@naturalcycles/nodejs-lib/colors'
import { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import type { Database } from 'sqlite'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { deleteByIdsSQL, insertKVSQL, selectKVSQL } from './query.util.js'
import { SqliteReadable } from './stream.util.js'

export interface SQLiteKeyValueDBCfg {
  filename: string

  /**
   * @default OPEN_READWRITE | OPEN_CREATE
   */
  mode?: number

  /**
   * @default sqlite.Database
   */
  driver?: any

  /**
   * Will log all sql queries executed.
   *
   * @default false
   */
  debug?: boolean

  /**
   * Defaults to `console`
   */
  logger?: CommonLogger
}

interface KeyValueObject {
  id: string
  v: Buffer
}

export class SqliteKeyValueDB implements CommonKeyValueDB {
  constructor(cfg: SQLiteKeyValueDBCfg) {
    this.cfg = {
      logger: console,
      ...cfg,
    }
  }

  cfg: SQLiteKeyValueDBCfg & { logger: CommonLogger }

  support = {
    ...commonKeyValueDBFullSupport,
    increment: false, // todo: can be implemented
  }

  _db?: Database

  get db(): Database {
    if (!this._db) {
      throw new Error('await SqliteKeyValueDB.open() should be called before using the DB')
    }
    return this._db
  }

  async open(): Promise<void> {
    if (this._db) return

    this._db = await open({
      driver: sqlite3.Database,
      // oxlint-disable-next-line no-bitwise
      mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      ...this.cfg,
    })
    this.cfg.logger.log(`${boldWhite(this.cfg.filename)} opened`)
  }

  async close(): Promise<void> {
    if (!this._db) return
    await this.db.close()
    this.cfg.logger.log(`${boldWhite(this.cfg.filename)} closed`)
  }

  async ping(): Promise<void> {
    await this.open()
  }

  async createTable(table: string, opt: CommonDBCreateOptions = {}): Promise<void> {
    if (opt.dropIfExists) await this.dropTable(table)

    const sql = `create table ${table} (id TEXT PRIMARY KEY, v BLOB NOT NULL)`
    this.cfg.logger.log(sql)
    await this.db.exec(sql)
  }

  /**
   * Use with caution!
   */
  async dropTable(table: string): Promise<void> {
    await this.db.exec(`DROP TABLE IF EXISTS ${table}`)
  }

  async deleteByIds(table: string, ids: string[]): Promise<void> {
    const sql = deleteByIdsSQL(table, ids)
    if (this.cfg.debug) this.cfg.logger.log(sql)
    await this.db.run(sql)
  }

  /**
   * API design note:
   * Here in the array of rows we have no way to map row to id (it's an opaque Buffer).
   */
  async getByIds(table: string, ids: string[]): Promise<KeyValueDBTuple[]> {
    const sql = selectKVSQL(table, ids)
    if (this.cfg.debug) this.cfg.logger.log(sql)
    const rows = await this.db.all<KeyValueObject[]>(sql)
    // console.log(rows)
    return rows.map(r => [r.id, r.v])
  }

  async saveBatch(table: string, entries: KeyValueDBTuple[]): Promise<void> {
    // todo: speedup
    const statements = insertKVSQL(table, entries)

    // if (statements.length > 1) await this.db.run('BEGIN TRANSACTION')

    await pMap(statements, async statement => {
      const [sql, params] = statement
      if (this.cfg.debug) this.cfg.logger.log(sql)
      await this.db.run(sql, ...params)
    })

    // if (statements.length > 1) await this.db.run('END TRANSACTION')
  }

  async beginTransaction(): Promise<void> {
    await this.db.run(`BEGIN TRANSACTION`)
  }

  async endTransaction(): Promise<void> {
    await this.db.run(`END TRANSACTION`)
  }

  streamIds(table: string, limit?: number): Pipeline<string> {
    let sql = `SELECT id FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    return Pipeline.fromAsyncReadable<ObjectWithId>(
      async () => await SqliteReadable.create<ObjectWithId>(this.db, sql),
    ).mapSync(r => r.id)
  }

  streamValues(table: string, limit?: number): Pipeline<Buffer> {
    let sql = `SELECT v FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    return Pipeline.fromAsyncReadable<{ v: Buffer }>(
      async () => await SqliteReadable.create<{ v: Buffer }>(this.db, sql),
    ).mapSync(r => r.v)
  }

  streamEntries(table: string, limit?: number): Pipeline<KeyValueDBTuple> {
    let sql = `SELECT id,v FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    return Pipeline.fromAsyncReadable<{ id: string; v: Buffer }>(
      async () => await SqliteReadable.create<{ id: string; v: Buffer }>(this.db, sql),
    ).mapSync(row => [row.id, row.v])
  }

  /**
   * Count rows in the given table.
   */
  async count(table: string): Promise<number> {
    const sql = `SELECT count(*) as cnt FROM ${table}`

    if (this.cfg.debug) this.cfg.logger.log(sql)

    const { cnt } = (await this.db.get<{ cnt: number }>(sql))!
    return cnt
  }

  async incrementBatch(_table: string, _entries: IncrementTuple[]): Promise<IncrementTuple[]> {
    throw new AppError('Not implemented')
  }
}
