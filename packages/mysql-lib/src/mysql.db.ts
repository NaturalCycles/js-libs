import type {
  CommonDB,
  CommonDBCreateOptions,
  CommonDBOptions,
  CommonDBSaveOptions,
  CommonDBSupport,
  RunQueryResult,
} from '@naturalcycles/db-lib'
import { BaseCommonDB, commonDBFullSupport, CommonDBType, DBQuery } from '@naturalcycles/db-lib'
import { _Memo } from '@naturalcycles/js-lib/decorators/memo.decorator.js'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { consoleLogger } from '@naturalcycles/js-lib/log'
import { _filterUndefinedValues, _mapKeys, _mapValues, _omit } from '@naturalcycles/js-lib/object'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import { white } from '@naturalcycles/nodejs-lib/colors'
import { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import type {
  Connection,
  Pool,
  PoolConnection,
  PoolOptions,
  QueryOptions,
  ResultSetHeader,
  TypeCast,
} from 'mysql2/promise'
import * as mysql from 'mysql2/promise'
import {
  dbQueryToSQLDelete,
  dbQueryToSQLSelect,
  dbQueryToSQLUpdate,
  insertSQL,
} from './query.util.js'
import type { MySQLTableStats } from './schema/mysql.schema.util.js'
import {
  jsonSchemaToMySQLDDL,
  mapNameFromMySQL,
  mysqlTableStatsToJsonSchemaField,
} from './schema/mysql.schema.util.js'

export interface MysqlDBOptions extends CommonDBOptions {}
export interface MysqlDBSaveOptions<ROW extends ObjectWithId> extends CommonDBSaveOptions<ROW> {}

/**
 * @default false / undefined
 */
export interface MysqlDBCfg extends PoolOptions {
  /**
   * If true - will log all produced SQL queries.
   */
  logSQL?: boolean

  /**
   * If true - will emit logs of connection events.
   */
  debugConnections?: boolean

  /**
   * Default to `consoleLogger`
   */
  logger?: CommonLogger
}

const BOOLEAN_TYPES = new Set(['TINY', 'TINYINT', 'INT'])
const BOOLEAN_BIT_TYPES = new Set(['BIT'])

const typeCast: TypeCast = (field, next) => {
  // cast to boolean
  if (field.length === 1) {
    if (BOOLEAN_BIT_TYPES.has(field.type)) {
      const b = field.buffer()
      if (b === null || b === undefined) return undefined // null = undefined
      return b[0] === 1 // 1 = true, 0 = false
    }

    if (BOOLEAN_TYPES.has(field.type)) {
      const s = field.string()
      // console.log(field.name, field.type, s, s?.charCodeAt(0))
      if (s === null || s === undefined) return undefined // null = undefined
      return s === '1' // 1 = true, 0 = false
    }
  }

  return next()
}

export class MysqlDB extends BaseCommonDB implements CommonDB {
  override dbType = CommonDBType.relational

  override support: CommonDBSupport = {
    ...commonDBFullSupport,
    updateSaveMethod: false, // todo: can be implemented
    transactions: false, // todo: can be implemented
    increment: false, // todo: can be implemented
    timeMachine: false,
  }

  constructor(cfg: MysqlDBCfg = {}) {
    super()
    this.cfg = {
      typeCast,
      // mysql2 defaults that differ from the `mysql` package, set back to what `mysql` did:
      // utf8 (not utf8mb4) connection charset, JSON columns as strings, DECIMAL as numbers
      charset: 'UTF8_GENERAL_CI',
      jsonStrings: true,
      decimalNumbers: true,
      // charset: 'utf8mb4', // for emoji support
      // host: 'localhost',
      // user: MYSQL_USER,
      // password: MYSQL_PW,
      // database: MYSQL_DB,
      ...cfg,
      logger: (cfg.logger || consoleLogger).child({ module: 'mysql' }),
    }
  }

  cfg: MysqlDBCfg & { logger: CommonLogger }

  override async ping(): Promise<void> {
    const con = await this.getConnection()
    con.release()
  }

  @_Memo()
  pool(): Pool {
    // mysql2 warns on options it doesn't know, so our own ones are left out
    const pool = mysql.createPool(_omit(this.cfg, ['logSQL', 'debugConnections', 'logger']))
    const { host, database, logger } = this.cfg
    logger.log(`connected to ${white(host + '/' + database)}`)

    if (this.cfg.debugConnections) {
      pool.on('acquire', con => {
        logger.log(`acquire(${con.threadId})`)
      })

      pool.on('connection', con => {
        logger.log(`connection(${con.threadId})`)
      })

      pool.on('enqueue', () => {
        logger.log(`enqueue`)
      })

      pool.on('release', con => {
        logger.log(`release(${con.threadId})`)
      })
    }

    return pool
  }

  async close(): Promise<void> {
    await this.pool().end()
    this.cfg.logger.log('closed')
  }

  /**
   * Be careful to always call `con.release()` when you get connection with this method.
   */
  async getConnection(): Promise<PoolConnection> {
    return await this.pool().getConnection()
  }

  /**
   * Manually create a single (not pool) connection.
   * Be careful to manage this connection yourself (open, release, etc).
   */
  async createSingleConnection(): Promise<Connection> {
    const con = await mysql.createConnection(
      _omit(this.cfg, ['logSQL', 'debugConnections', 'logger']),
    )
    const { threadId } = con

    if (this.cfg.debugConnections) {
      this.cfg.logger.log(`createSingleConnection(${threadId})`)

      con.on('connect', () => this.cfg.logger.log(`createSingleConnection(${threadId}).connect`))
      con.on('drain', () => this.cfg.logger.log(`createSingleConnection(${threadId}).drain`))
      con.on('enqueue', () => this.cfg.logger.log(`createSingleConnection(${threadId}).enqueue`))
      con.on('end', () => this.cfg.logger.log(`createSingleConnection(${threadId}).end`))
    }

    con.on('error', err => {
      this.cfg.logger.error({ msg: `createSingleConnection(${threadId}).error`, err })
    })

    return con
  }

  // GET
  override async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: readonly string[],
    opt: MysqlDBOptions = {},
  ): Promise<ROW[]> {
    if (!ids.length) return []
    const q = new DBQuery<ROW>(table).filterEq('id', ids)
    const { rows } = await this.runQuery(q, opt)
    return rows.map(r => _mapKeys(r, k => mapNameFromMySQL(k as string)) as any)
  }

  // QUERY
  override async runQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt: MysqlDBOptions = {},
  ): Promise<RunQueryResult<ROW>> {
    const sql = dbQueryToSQLSelect(q)
    if (!sql) {
      return {
        rows: [],
      }
    }

    const rows = (await this.runSQL<ROW[]>({ sql })).map(
      row =>
        _mapKeys(_filterUndefinedValues(row, { mutate: true }), k =>
          mapNameFromMySQL(k as string),
        ) as any,
    )

    // edge case where 0 fields are selected
    if (q._selectedFieldNames?.length === 0) {
      return {
        rows: rows.map(_ => ({}) as any),
      }
    }

    return {
      rows,
    }
  }

  async runSQL<RESULT>(q: QueryOptions): Promise<RESULT> {
    if (this.cfg.logSQL) {
      this.cfg.logger.log(_filterUndefinedValues({ msg: q.sql, values: q.values }))
    }

    const [result] = await this.pool().query(q)
    return result as RESULT
  }

  /**
   * Allows to run semicolon-separated "SQL file".
   * E.g "ddl reset script".
   */
  async runSQLString(s: string): Promise<void> {
    const queries = s
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)

    for (const sql of queries) {
      await this.runSQL({ sql })
    }
  }

  override async runQueryCount<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<number> {
    const { rows } = await this.runQuery(q.select(['count(*) as _count' as any]))
    return (rows[0] as any)._count
  }

  override streamQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt: MysqlDBOptions = {},
  ): Pipeline<ROW> {
    const sql = dbQueryToSQLSelect(q)
    if (!sql) {
      return Pipeline.fromArray([])
    }

    return this.streamSQL<ROW>(sql).mapSync(row => _filterUndefinedValues(row, { mutate: true }))
  }

  /**
   * Streaming is not part of the mysql2 promise API, so it goes through the underlying callback pool.
   */
  streamSQL<ROW>(sql: string): Pipeline<ROW> {
    if (this.cfg.logSQL) this.cfg.logger.log(`stream: ${sql}`)

    // todo: mysql2 streams are `node:stream` Readables (unlike `mysql`'s `readable-stream@2`), so this can now use iterable helpers:
    // return (this.pool().pool.query(sql).stream() as ReadableTyped<ROW>).map(row =>
    //   _filterUndefinedValues(row, true),
    // )
    return Pipeline.from<ROW>(this.pool().pool.query(sql).stream())
  }

  // SAVE
  override async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rowsInput: readonly ROW[],
    opt: MysqlDBSaveOptions<ROW> = {},
  ): Promise<void> {
    if (!rowsInput.length) return

    // Stringify object values
    const rows = rowsInput.map(row =>
      _mapValues<ROW>(row, (_k, v) => {
        if (v && typeof v === 'object' && !Buffer.isBuffer(v)) {
          // This is to avoid implicit Date stringification and mismatch: it gets saved as Date, but loaded as String
          _assert(
            // oxlint-disable-next-line no-restricted-globals -- detects Date values to reject them
            !(v instanceof Date),
            'mysql-lib does not support Date values, please stringify them before passing',
          )
          return JSON.stringify(v)
        }
        return v
      }),
    )

    if (opt.assignGeneratedIds) {
      // Insert rows one-by-one, to get their auto-generated id

      let i = -1
      for (const row of rows) {
        i++
        if (row.id) {
          // Update already existing
          const query = new DBQuery(table).filterEq('id', row.id)
          await this.patchByQuery(query, _omit(row, ['id']))
        } else {
          // Create new
          const sql = insertSQL(table, [row], 'INSERT', this.cfg.logger)[0]!
          const { insertId } = await this.runSQL<ResultSetHeader>({ sql })

          // Mutate the input row with insertIt
          rowsInput[i]!.id = insertId as any // this is because we no longer support number ids in CommonDB
        }
      }

      return
    }

    if (opt.saveMethod === 'update') {
      // TODO: This fails if a combination of entities with id and without id are parsed
      for (const row of rows) {
        // Update already existing
        _assert(row.id, 'id is required for updating')
        const query = new DBQuery(table).filterEq('id', row.id)
        await this.patchByQuery(query, _omit(row, ['id']))
      }
      return
    }

    const verb = opt.saveMethod === 'insert' ? 'INSERT' : 'REPLACE'
    // inserts are split into multiple sentenses to respect the max_packet_size (1Mb usually)
    const sqls = insertSQL(table, rows, verb, this.cfg.logger)

    for (const sql of sqls) {
      await this.runSQL({ sql })
    }
  }

  // DELETE
  /**
   * Limitation: always returns [], regardless of which rows are actually deleted
   */
  override async deleteByIds(
    table: string,
    ids: readonly string[],
    _opt?: MysqlDBOptions,
  ): Promise<number> {
    if (!ids.length) return 0
    const sql = dbQueryToSQLDelete(new DBQuery(table).filterEq('id', ids))
    if (!sql) return 0

    const { affectedRows } = await this.runSQL<ResultSetHeader>({ sql })
    return affectedRows
  }

  override async deleteByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<number> {
    const sql = dbQueryToSQLDelete(q)
    if (!sql) return 0
    const { affectedRows } = await this.runSQL<ResultSetHeader>({ sql })
    return affectedRows
  }

  /**
   * Use with caution!
   */
  async dropTable(table: string): Promise<void> {
    await this.runSQL({ sql: `DROP TABLE IF EXISTS ${table}` })
  }

  /**
   * dropIfExists=true needed as a safety check
   */
  override async createTable<ROW extends ObjectWithId>(
    table: string,
    schema: JsonSchema<ROW>,
    opt: CommonDBCreateOptions = {},
  ): Promise<void> {
    if (opt.dropIfExists) await this.dropTable(table)

    const sql = jsonSchemaToMySQLDDL(table, schema)
    await this.runSQL({ sql })
  }

  override async getTables(): Promise<string[]> {
    return (await this.runSQL<Record<any, any>[]>({ sql: `show tables` }))
      .map(r => Object.values(r)[0])
      .filter(Boolean)
  }

  override async getTableSchema<ROW extends ObjectWithId>(table: string): Promise<JsonSchema<ROW>> {
    const stats = await this.runSQL<MySQLTableStats[]>({
      sql: `describe ${mysql.escapeId(table)}`,
    })

    return mysqlTableStatsToJsonSchemaField<ROW>(table, stats, this.cfg.logger)
  }

  override async patchByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    patch: Partial<ROW>,
  ): Promise<number> {
    const sql = dbQueryToSQLUpdate(q, patch)
    if (!sql) return 0

    const { affectedRows } = await this.runSQL<ResultSetHeader>({ sql })
    return affectedRows
  }
}
