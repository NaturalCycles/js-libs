import type { CommonDBCreateOptions } from '@naturalcycles/db-lib'
import type { CommonKeyValueDB, IncrementTuple, KeyValueDBTuple } from '@naturalcycles/db-lib/kv'
import { commonKeyValueDBFullSupport } from '@naturalcycles/db-lib/kv'
import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import { boldWhite } from '@naturalcycles/nodejs-lib/colors'
import { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import type { Database, Options } from 'better-sqlite3'
import BetterSqlite3 from 'better-sqlite3'

export interface BetterSQLiteKeyValueDBCfg extends Options {
  filename: string

  // todo: refactor to logLevel instead
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

/**
 * @experimental
 */
export class BetterSqliteKeyValueDB implements CommonKeyValueDB {
  constructor(cfg: BetterSQLiteKeyValueDBCfg) {
    this.cfg = {
      logger: console,
      ...cfg,
    }
  }

  cfg: BetterSQLiteKeyValueDBCfg & { logger: CommonLogger }

  support = {
    ...commonKeyValueDBFullSupport,
    increment: false, // todo: can be supported
  }

  _db?: Database

  get db(): Database {
    if (!this._db) {
      this.open()
    }

    return this._db!
  }

  open(): void {
    if (this._db) return

    this._db = new BetterSqlite3(this.cfg.filename, {
      verbose: this.cfg.debug ? this.cfg.logger.log : undefined,
      ...this.cfg,
    })

    this.cfg.logger.log(`${boldWhite(this.cfg.filename)} opened`)
  }

  close(): void {
    if (!this._db) return
    this.db.close()
    this.cfg.logger.log(`${boldWhite(this.cfg.filename)} closed`)
  }

  async ping(): Promise<void> {
    this.open()
  }

  async createTable(table: string, opt: CommonDBCreateOptions = {}): Promise<void> {
    if (opt.dropIfExists) this.dropTable(table)

    const sql = `create table ${table} (id TEXT PRIMARY KEY, v BLOB NOT NULL)`
    this.cfg.logger.log(sql)
    this.db.prepare(sql).run()
  }

  /**
   * Use with caution!
   */
  dropTable(table: string): void {
    this.db.prepare(`DROP TABLE IF EXISTS ${table}`).run()
  }

  async deleteByIds(table: string, ids: string[]): Promise<void> {
    const sql = `DELETE FROM ${table} WHERE id in (${ids.map(id => `'${id}'`).join(',')})`
    if (this.cfg.debug) this.cfg.logger.log(sql)
    this.db.prepare(sql).run()
  }

  /**
   * API design note:
   * Here in the array of rows we have no way to map row to id (it's an opaque Buffer).
   */
  async getByIds(table: string, ids: string[]): Promise<KeyValueDBTuple[]> {
    const sql = `SELECT id,v FROM ${table} where id in (${ids.map(id => `'${id}'`).join(',')})`
    if (this.cfg.debug) this.cfg.logger.log(sql)
    const rows = this.db.prepare(sql).all() as KeyValueObject[]
    // console.log(rows)
    return rows.map(r => [r.id, r.v])
  }

  async saveBatch(table: string, entries: KeyValueDBTuple[]): Promise<void> {
    const sql = `INSERT INTO ${table} (id, v) VALUES (?, ?)`
    if (this.cfg.debug) this.cfg.logger.log(sql)

    const stmt = this.db.prepare(sql)

    for (const [id, buf] of entries) {
      stmt.run(id, buf)
    }
  }

  async beginTransaction(): Promise<void> {
    this.db.exec(`BEGIN TRANSACTION`)
  }

  async endTransaction(): Promise<void> {
    this.db.exec(`END TRANSACTION`)
  }

  streamIds(table: string, limit?: number): Pipeline<string> {
    let sql = `SELECT id FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    return Pipeline.fromIterable(
      this.db.prepare(sql).iterate() as IterableIterator<ObjectWithId>,
    ).mapSync(row => row.id)
  }

  streamValues(table: string, limit?: number): Pipeline<Buffer> {
    let sql = `SELECT v FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    return Pipeline.fromIterable(
      this.db.prepare(sql).iterate() as IterableIterator<{ v: Buffer }>,
    ).mapSync(row => row.v)
  }

  streamEntries(table: string, limit?: number): Pipeline<KeyValueDBTuple> {
    let sql = `SELECT id,v FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    return Pipeline.fromIterable(
      this.db.prepare(sql).iterate() as IterableIterator<{ id: string; v: Buffer }>,
    ).mapSync(row => [row.id, row.v])
  }

  /**
   * Count rows in the given table.
   */
  async count(table: string): Promise<number> {
    const sql = `SELECT count(*) as cnt FROM ${table}`

    if (this.cfg.debug) this.cfg.logger.log(sql)

    const { cnt } = this.db.prepare(sql).get() as { cnt: number }
    return cnt
  }

  async increment(_table: string, _id: string, _by?: number): Promise<number> {
    throw new AppError('Not implemented')
  }

  async incrementBatch(_table: string, _entries: IncrementTuple[]): Promise<IncrementTuple[]> {
    throw new AppError('Not implemented')
  }
}
