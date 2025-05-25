import type { DBQuery, DBQueryFilterOperator } from '@naturalcycles/db-lib'
import type { AnyObjectWithId, CommonLogger } from '@naturalcycles/js-lib'
import { _hb } from '@naturalcycles/js-lib'
import { white, yellow } from '@naturalcycles/nodejs-lib'
import type { QueryOptions } from 'mysql'
import * as mysql from 'mysql'
import { mapNameToMySQL } from './schema/mysql.schema.util.js'

const MAX_PACKET_SIZE = 1024 * 1024 // 1Mb
const MAX_ROW_SIZE = 800 * 1024 // 1Mb - margin

/**
 * Returns `null` if it detects that 0 rows will be returned,
 * e.g when `IN ()` (empty array) is used.
 */
export function dbQueryToSQLSelect(q: DBQuery<any>): string | null {
  const tokens = selectTokens(q)

  // filters
  const whereTokens = getWhereTokens(q)
  if (!whereTokens) return null
  tokens.push(...whereTokens)

  // order
  tokens.push(...groupOrderTokens(q))

  // offset/limit
  tokens.push(...offsetLimitTokens(q))

  return tokens.join(' ')
}

/**
 * Returns null in "0 rows" case.
 */
export function dbQueryToSQLDelete(q: DBQuery<any>): string | null {
  const tokens = [`DELETE FROM`, mysql.escapeId(q.table)]

  // filters
  const whereTokens = getWhereTokens(q)
  if (!whereTokens) return null
  tokens.push(...whereTokens)

  // offset/limit
  tokens.push(...offsetLimitTokens(q))

  return tokens.join(' ')
}

/**
 * Returns array of sql statements to respect the max sql size.
 */
export function insertSQL(
  table: string,
  rows: Record<any, any>[],
  verb: 'INSERT' | 'REPLACE' = 'INSERT',
  logger: CommonLogger = console,
): string[] {
  // INSERT INTO table_name (column1, column2, column3, ...)
  // VALUES (value1, value2, value3, ...);

  // eslint-disable-next-line unicorn/no-array-reduce
  const fieldSet = rows.reduce((set: Set<string>, row) => {
    Object.keys(row).forEach(field => set.add(field))
    return set
  }, new Set<string>())
  const fields = [...fieldSet]

  const start = [
    verb,
    `INTO`,
    mysql.escapeId(table),
    `(` + [...fields].map(f => mysql.escapeId(mapNameToMySQL(f))).join(',') + `)`,
    `VALUES\n`,
  ].join(' ')

  const valueRows = rows.map(rec => {
    return `(` + fields.map(k => mysql.escape(rec[k])).join(',') + `)`
  })

  const full = start + valueRows.join(',\n')

  if (full.length < MAX_PACKET_SIZE) return [full]

  const sqls: string[] = []
  let sql: string | undefined

  valueRows.forEach(vrow => {
    if (!sql) {
      sql = start + vrow
    } else {
      if (sql.length + vrow.length >= MAX_ROW_SIZE) {
        sqls.push(sql)
        sql = start + vrow // reset
      } else {
        sql += ',\n ' + vrow // add
      }
    }
  })

  if (sql) {
    sqls.push(sql) // last one
  }

  logger.log(
    `${white(table)} large sql query (${yellow(_hb(full.length))}) was split into ${yellow(
      sqls.length,
    )} chunks`,
  )

  return sqls

  // todo: handle "upsert" later
}

export function insertSQLSingle(table: string, record: Record<any, any>): string {
  // INSERT INTO table_name (column1, column2, column3, ...)
  // VALUES (value1, value2, value3, ...);

  const tokens = [
    `INSERT INTO`,
    mysql.escapeId(table),
    `(` +
      Object.keys(record)
        .map(f => mysql.escapeId(mapNameToMySQL(f)))
        .join(',') +
      `)`,
    `\nVALUES`,
    `(` +
      Object.values(record)
        .map(v => mysql.escapeId(v))
        .join(',') +
      `)`,
  ]

  return tokens.join(' ')
}

export function insertSQLSetSingle(table: string, record: Record<any, any>): QueryOptions {
  return {
    sql: `INSERT INTO ${mysql.escapeId(table)} SET ?`,
    values: [record],
  }
}

export function dbQueryToSQLUpdate(q: DBQuery<any>, patch: Record<any, any>): string | null {
  // var sql = mysql.format('UPDATE posts SET modified = ? WHERE id = ?', [CURRENT_TIMESTAMP, 42]);
  const whereTokens = getWhereTokens(q)
  if (!whereTokens) return null

  const tokens = [
    `UPDATE`,
    mysql.escapeId(q.table),
    `SET`,
    Object.keys(patch)
      .map(f => mysql.escapeId(mapNameToMySQL(f)) + ' = ?')
      .join(', '),
    ...whereTokens,
  ]

  return mysql.format(tokens.join(' '), Object.values(patch))
}

function selectTokens(q: DBQuery<any>): string[] {
  let fields = ['*']

  if (q._selectedFieldNames) {
    fields = q._selectedFieldNames.length ? (q._selectedFieldNames as string[]) : ['id']
  }

  // We don't do `escapeId` cause it'll ruin e.g SELECT `count *` FROM ...
  return [
    `SELECT`,
    q._distinct && ('DISTINCT' as any),
    fields.map(f => mapNameToMySQL(f)).join(', '),
    `FROM`,
    mysql.escapeId(q.table),
  ].filter(Boolean)
}

function offsetLimitTokens(q: DBQuery<any>): string[] {
  const tokens: string[] = []

  if (q._limitValue) {
    tokens.push(`LIMIT`, String(q._limitValue))

    // In SQL OFFSET is only allowed if LIMIT is set
    if (q._offsetValue) {
      tokens.push(`OFFSET`, String(q._offsetValue))
    }
  }

  return tokens
}

function groupOrderTokens(q: DBQuery<AnyObjectWithId>): string[] {
  const t: string[] = []

  if (q._groupByFieldNames?.length) {
    t.push(`GROUP BY`, q._groupByFieldNames.map(c => `\`${c}\``).join(', '))
  }

  if (q._orders.length) {
    t.push(
      `ORDER BY`,
      q._orders.map(o => `\`${o.name}\` ${o.descending ? 'DESC' : 'ASC'}`).join(', '),
    )
  }

  return t
}

const OP_MAP: Partial<Record<DBQueryFilterOperator, string>> = {
  '==': '=',
}

/**
 * Returns `null` for "guaranteed 0 rows" cases.
 */
function getWhereTokens(q: DBQuery<any>): string[] | null {
  if (!q._filters.length) return []

  let returnNull = false

  const tokens = [
    `WHERE`,
    q._filters
      .map(f => {
        if (f.val === null || f.val === undefined) {
          // special treatment

          return [
            mysql.escapeId(mapNameToMySQL(f.name as string)),
            f.op === '==' ? 'IS NULL' : 'IS NOT NULL',
          ].join(' ')
        }

        if (Array.isArray(f.val)) {
          // special case for arrays
          if (!f.val.length) returnNull = true

          return `${mysql.escapeId(mapNameToMySQL(f.name as string))} IN (${mysql.escape(f.val)})`
        }

        return [
          mysql.escapeId(mapNameToMySQL(f.name as string)),
          OP_MAP[f.op] || f.op,
          mysql.escape(f.val),
        ].join(' ')
      })
      .join(' AND '),
  ]

  if (returnNull) return null

  return tokens
}
