import { Readable, Transform } from 'node:stream'
import { promisify } from 'node:util'
import type {
  CommonDB,
  CommonDBCreateOptions,
  CommonDBOptions,
  CommonDBSaveOptions,
  CommonDBSupport,
  RunQueryResult,
} from '@naturalcycles/db-lib'
import { BaseCommonDB, commonDBFullSupport, CommonDBType, DBQuery } from '@naturalcycles/db-lib'
import type {
  CommonLogger,
  JsonSchemaObject,
  JsonSchemaRootObject,
  ObjectWithId,
} from '@naturalcycles/js-lib'
import {
  _assert,
  _filterUndefinedValues,
  _mapKeys,
  _mapValues,
  _Memo,
  _omit,
  commonLoggerPrefix,
} from '@naturalcycles/js-lib'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib'
import { white } from '@naturalcycles/nodejs-lib'
import type {
  Connection,
  OkPacket,
  Pool,
  PoolConfig,
  PoolConnection,
  QueryOptions,
  TypeCast,
} from 'mysql'
import * as mysql from 'mysql'
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
export interface MysqlDBCfg extends PoolConfig {
  /**
   * If true - will log all produced SQL queries.
   */
  logSQL?: boolean

  /**
   * If true - will emit logs of connection events.
   */
  debugConnections?: boolean

  /**
   * Default to `console`
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
  }

  constructor(cfg: MysqlDBCfg = {}) {
    super()
    this.cfg = {
      typeCast,
      // charset: 'utf8mb4', // for emoji support
      // host: 'localhost',
      // user: MYSQL_USER,
      // password: MYSQL_PW,
      // database: MYSQL_DB,
      ...cfg,
      logger: commonLoggerPrefix(cfg.logger || console, '[mysql]'),
    }
  }

  cfg: MysqlDBCfg & { logger: CommonLogger }

  override async ping(): Promise<void> {
    const con = await this.getConnection()
    con.release()
  }

  @_Memo()
  pool(): Pool {
    const pool = mysql.createPool(this.cfg)
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

    pool.on('error', err => {
      logger.error(err)
    })

    return pool
  }

  async close(): Promise<void> {
    const pool = this.pool()

    await promisify(pool.end.bind(pool))()
    this.cfg.logger.log('closed')
  }

  /**
   * Be careful to always call `con.release()` when you get connection with this method.
   */
  async getConnection(): Promise<PoolConnection> {
    const pool = this.pool()
    return await promisify(pool.getConnection.bind(pool))()
  }

  /**
   * Manually create a single (not pool) connection.
   * Be careful to manage this connection yourself (open, release, etc).
   */
  async createSingleConnection(): Promise<Connection> {
    const con = mysql.createConnection(this.cfg)
    await promisify(con.connect.bind(con))()
    const { threadId } = con

    if (this.cfg.debugConnections) {
      this.cfg.logger.log(`createSingleConnection(${threadId})`)

      con.on('connect', () => this.cfg.logger.log(`createSingleConnection(${threadId}).connect`))
      con.on('drain', () => this.cfg.logger.log(`createSingleConnection(${threadId}).drain`))
      con.on('enqueue', () => this.cfg.logger.log(`createSingleConnection(${threadId}).enqueue`))
      con.on('end', () => this.cfg.logger.log(`createSingleConnection(${threadId}).end`))
    }

    con.on('error', err => {
      this.cfg.logger.error(`createSingleConnection(${threadId}).error`, err)
    })

    return con
  }

  // GET
  override async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: string[],
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
      row => _mapKeys(_filterUndefinedValues(row, true), k => mapNameFromMySQL(k as string)) as any,
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
    if (this.cfg.logSQL) this.cfg.logger.log(...[q.sql, q.values].filter(Boolean))

    return await new Promise<RESULT>((resolve, reject) => {
      this.pool().query(q, (err, res) => {
        if (err) return reject(err)
        resolve(res)
      })
    })
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
  ): ReadableTyped<ROW> {
    const sql = dbQueryToSQLSelect(q)
    if (!sql) {
      return Readable.from([])
    }

    if (this.cfg.logSQL) this.cfg.logger.log(`stream: ${sql}`)

    // todo: this is nice, but `mysql` package uses `readable-stream@2` which is not compatible with `node:stream` iterable helpers
    // return (this.pool().query(sql).stream() as ReadableTyped<ROW>).map(row =>
    //   _filterUndefinedValues(row, true),
    // )
    return this.pool()
      .query(sql)
      .stream()
      .pipe(
        new Transform({
          objectMode: true,
          transform(row: ROW, _encoding, cb) {
            cb(null, _filterUndefinedValues(row, true))
          },
        }),
      )
  }

  // SAVE
  override async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rowsInput: ROW[],
    opt: MysqlDBSaveOptions<ROW> = {},
  ): Promise<void> {
    if (!rowsInput.length) return

    // Stringify object values
    const rows = rowsInput.map(row =>
      _mapValues<ROW>(row, (_k, v) => {
        if (v && typeof v === 'object' && !Buffer.isBuffer(v)) {
          // This is to avoid implicit Date stringification and mismatch: it gets saved as Date, but loaded as String
          _assert(
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
          const { insertId } = await this.runSQL<OkPacket>({ sql })

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
  override async deleteByIds(table: string, ids: string[], _opt?: MysqlDBOptions): Promise<number> {
    if (!ids.length) return 0
    const sql = dbQueryToSQLDelete(new DBQuery(table).filterEq('id', ids))
    if (!sql) return 0

    const { affectedRows } = await this.runSQL<OkPacket>({ sql })
    return affectedRows
  }

  override async deleteByQuery<ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<number> {
    const sql = dbQueryToSQLDelete(q)
    if (!sql) return 0
    const { affectedRows } = await this.runSQL<OkPacket>({ sql })
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
    schema: JsonSchemaObject<ROW>,
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

  override async getTableSchema<ROW extends ObjectWithId>(
    table: string,
  ): Promise<JsonSchemaRootObject<ROW>> {
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

    const { affectedRows } = await this.runSQL<OkPacket>({ sql })
    return affectedRows
  }
}
