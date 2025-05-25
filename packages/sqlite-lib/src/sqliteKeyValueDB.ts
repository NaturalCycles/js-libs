import type {
  CommonDBCreateOptions,
  CommonKeyValueDB,
  IncrementTuple,
  KeyValueDBTuple,
} from '@naturalcycles/db-lib'
import { commonKeyValueDBFullSupport } from '@naturalcycles/db-lib'
import type { CommonLogger } from '@naturalcycles/js-lib'
import { AppError, pMap } from '@naturalcycles/js-lib'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib'
import { boldWhite, readableCreate } from '@naturalcycles/nodejs-lib'
import type { Database } from 'sqlite'
import { open } from 'sqlite'
import * as sqlite3 from 'sqlite3'
import { OPEN_CREATE, OPEN_READWRITE } from 'sqlite3'
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
      // eslint-disable-next-line no-bitwise
      mode: OPEN_READWRITE | OPEN_CREATE,
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

  streamIds(table: string, limit?: number): ReadableTyped<string> {
    const readable = readableCreate<string>()

    let sql = `SELECT id FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    void SqliteReadable.create<{ id: string }>(this.db, sql).then(async stream => {
      for await (const row of stream) {
        readable.push(row.id)
      }

      // Close the statement before "finishing" the steam!
      await stream.close()

      // Now we're done
      readable.push(null)
    })

    return readable
  }

  streamValues(table: string, limit?: number): ReadableTyped<Buffer> {
    const readable = readableCreate<Buffer>()

    let sql = `SELECT v FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    void SqliteReadable.create<{ v: Buffer }>(this.db, sql).then(async stream => {
      for await (const row of stream) {
        readable.push(row.v)
      }

      // Close the statement before "finishing" the steam!
      await stream.close()

      // Now we're done
      readable.push(null)
    })

    return readable
  }

  streamEntries(table: string, limit?: number): ReadableTyped<KeyValueDBTuple> {
    const readable = readableCreate<KeyValueDBTuple>()

    let sql = `SELECT id,v FROM ${table}`
    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    void SqliteReadable.create<KeyValueObject>(this.db, sql).then(async stream => {
      for await (const row of stream) {
        readable.push([row.id, row.v])
      }

      // Close the statement before "finishing" the steam!
      await stream.close()

      // Now we're done
      readable.push(null)
    })

    return readable
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
