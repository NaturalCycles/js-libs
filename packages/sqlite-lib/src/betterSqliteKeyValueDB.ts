import type {
  CommonDBCreateOptions,
  CommonKeyValueDB,
  IncrementTuple,
  KeyValueDBTuple,
} from '@naturalcycles/db-lib'
import { commonKeyValueDBFullSupport } from '@naturalcycles/db-lib'
import type { CommonLogger } from '@naturalcycles/js-lib'
import { AppError } from '@naturalcycles/js-lib'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib'
import { boldWhite, readableCreate } from '@naturalcycles/nodejs-lib'
import type { Database, Options } from 'better-sqlite3'
import BetterSqlite3 from 'better-sqlite3'

export interface BetterSQLiteKeyValueDBCfg extends Options {
  filename: string

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

    entries.forEach(([id, buf]) => {
      stmt.run(id, buf)
    })
  }

  async beginTransaction(): Promise<void> {
    this.db.exec(`BEGIN TRANSACTION`)
  }

  async endTransaction(): Promise<void> {
    this.db.exec(`END TRANSACTION`)
  }

  streamIds(table: string, limit?: number): ReadableTyped<string> {
    const readable = readableCreate<string>()

    let sql = `SELECT id FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    void (async () => {
      for (const row of this.db.prepare(sql).iterate()) {
        readable.push((row as { id: string }).id)
      }

      // Now we're done
      readable.push(null)
    })()

    return readable
  }

  streamValues(table: string, limit?: number): ReadableTyped<Buffer> {
    const readable = readableCreate<Buffer>()

    let sql = `SELECT v FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    void (async () => {
      for (const row of this.db.prepare(sql).iterate()) {
        readable.push((row as { v: Buffer }).v)
      }

      // Now we're done
      readable.push(null)
    })()

    return readable
  }

  streamEntries(table: string, limit?: number): ReadableTyped<KeyValueDBTuple> {
    const readable = readableCreate<KeyValueDBTuple>()

    let sql = `SELECT id,v FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    void (async () => {
      for (const row of this.db.prepare(sql).iterate()) {
        readable.push([(row as any).id, (row as any).v])
      }

      // Now we're done
      readable.push(null)
    })()

    return readable
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
