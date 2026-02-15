import { DatabaseSync } from 'node:sqlite'
import type { CommonDBCreateOptions } from '@naturalcycles/db-lib'
import type {
  CommonKeyValueDB,
  CommonSyncKeyValueDB,
  IncrementTuple,
  KeyValueDBTuple,
} from '@naturalcycles/db-lib/kv'
import { commonKeyValueDBFullSupport } from '@naturalcycles/db-lib/kv'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import { boldWhite } from '@naturalcycles/nodejs-lib/colors'
import { Pipeline } from '@naturalcycles/nodejs-lib/stream'

/**
 * CommonKeyValueDB implementation using Node.js built-in `node:sqlite` module.
 *
 * @experimental
 */
export class SqliteKeyValueDB implements CommonKeyValueDB, CommonSyncKeyValueDB, Disposable {
  constructor(cfg: NodeSQLiteKeyValueDBCfg) {
    this.cfg = {
      logger: console,
      ...cfg,
    }
  }

  cfg: NodeSQLiteKeyValueDBCfg & { logger: CommonLogger }

  support = {
    ...commonKeyValueDBFullSupport,
  }

  _db?: DatabaseSync

  get db(): DatabaseSync {
    if (!this._db) {
      this.open()
    }

    return this._db!
  }

  open(): void {
    if (this._db) return

    this._db = new DatabaseSync(this.cfg.filename, {
      readOnly: this.cfg.readOnly,
    })

    this.cfg.logger.log(`${boldWhite(this.cfg.filename)} opened`)
  }

  close(): void {
    if (!this._db) return
    this.db.close()
    this._db = undefined
    this.cfg.logger.log(`${boldWhite(this.cfg.filename)} closed`)
  }

  [Symbol.dispose](): void {
    this.close()
  }

  async ping(): Promise<void> {
    this.pingSync()
  }

  pingSync(): void {
    this.open()
  }

  async createTable(table: string, opt: CommonDBCreateOptions = {}): Promise<void> {
    this.createTableSync(table, opt)
  }

  createTableSync(table: string, opt: CommonDBCreateOptions = {}): void {
    if (opt.dropIfExists) this.dropTable(table)

    const sql = `create table ${table} (id TEXT PRIMARY KEY, v BLOB NOT NULL)`
    this.cfg.logger.log(sql)
    this.db.exec(sql)
  }

  /**
   * Use with caution!
   */
  dropTable(table: string): void {
    this.db.exec(`DROP TABLE IF EXISTS ${table}`)
  }

  async deleteByIds(table: string, ids: string[]): Promise<void> {
    this.deleteByIdsSync(table, ids)
  }

  deleteByIdsSync(table: string, ids: string[]): void {
    const sql = `DELETE FROM ${table} WHERE id in (${ids.map(id => `'${id}'`).join(',')})`
    if (this.cfg.debug) this.cfg.logger.log(sql)
    this.db.prepare(sql).run()
  }

  async getByIds(table: string, ids: string[]): Promise<KeyValueDBTuple[]> {
    return this.getByIdsSync(table, ids)
  }

  /**
   * API design note:
   * Here in the array of rows we have no way to map row to id (it's an opaque Buffer).
   */
  getByIdsSync(table: string, ids: string[]): KeyValueDBTuple[] {
    const sql = `SELECT id,v FROM ${table} where id in (${ids.map(id => `'${id}'`).join(',')})`
    if (this.cfg.debug) this.cfg.logger.log(sql)
    const rows = this.db.prepare(sql).all() as unknown as KeyValueObject[]
    return rows.map(r => [r.id, Buffer.from(r.v)])
  }

  async saveBatch(table: string, entries: KeyValueDBTuple[]): Promise<void> {
    this.saveBatchSync(table, entries)
  }

  saveBatchSync(table: string, entries: KeyValueDBTuple[]): void {
    const sql = `INSERT INTO ${table} (id, v) VALUES (?, ?)`
    if (this.cfg.debug) this.cfg.logger.log(sql)

    const stmt = this.db.prepare(sql)

    for (const [id, buf] of entries) {
      stmt.run(id, buf)
    }
  }

  beginTransaction(): void {
    this.db.exec(`BEGIN TRANSACTION`)
  }

  endTransaction(): void {
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
    ).mapSync(row => Buffer.from(row.v))
  }

  streamEntries(table: string, limit?: number): Pipeline<KeyValueDBTuple> {
    let sql = `SELECT id,v FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    return Pipeline.fromIterable(
      this.db.prepare(sql).iterate() as IterableIterator<{ id: string; v: Buffer }>,
    ).mapSync(row => [row.id, Buffer.from(row.v)])
  }

  /**
   * Count rows in the given table.
   */
  async count(table: string): Promise<number> {
    return this.countSync(table)
  }

  countSync(table: string): number {
    const sql = `SELECT count(*) as cnt FROM ${table}`

    if (this.cfg.debug) this.cfg.logger.log(sql)

    const { cnt } = this.db.prepare(sql).get() as { cnt: number }
    return cnt
  }

  async incrementBatch(table: string, entries: IncrementTuple[]): Promise<IncrementTuple[]> {
    return this.incrementBatchSync(table, entries)
  }

  incrementBatchSync(table: string, entries: IncrementTuple[]): IncrementTuple[] {
    const upsert = this.db.prepare(
      `INSERT INTO ${table} (id, v) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET v = CAST(v AS INTEGER) + excluded.v`,
    )
    const select = this.db.prepare(`SELECT CAST(v AS INTEGER) as v FROM ${table} WHERE id = ?`)

    return entries.map(([id, by]) => {
      upsert.run(id, by)
      const row = select.get(id) as { v: number }
      return [id, row.v]
    })
  }
}

export interface NodeSQLiteKeyValueDBCfg {
  filename: string

  /**
   * @default false
   */
  readOnly?: boolean

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
