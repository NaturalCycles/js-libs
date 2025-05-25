import type { KeyValueDBTuple } from '@naturalcycles/db-lib'
import type { SQLStatement } from 'sql-template-strings'
import { SQL } from 'sql-template-strings'

export type SQLWithParams = [sql: string, params: any[]]

export function insertSQL(table: string, rows: Record<string, any>[]): SQLWithParams[] {
  return rows.map(r => {
    return [
      `INSERT INTO ${table} (${Object.keys(r).join(', ')}) VALUES (${Object.values(r)
        .map(() => '?')
        .join(', ')})`,
      Object.values(r),
    ]
  })
}

export function insertSQL2(table: string, rows: Record<string, any>[]): SQLStatement[] {
  return rows.map(r => {
    return SQL`INSERT INTO ${table} (${Object.keys(r).join(', ')}) VALUES (${Object.values(r).join(
      ', ',
    )})`
  })
}

export function deleteByIdsSQL(table: string, ids: string[]): string {
  return `DELETE FROM ${table} WHERE id in (${ids.map(id => `"${id}"`).join(',')})`
}

export function insertKVSQL(table: string, entries: KeyValueDBTuple[]): SQLWithParams[] {
  return entries.map(([id, buf]) => {
    return [`INSERT INTO ${table} (id, v) VALUES (?, ?)`, [id, buf]]
  })
}

export function selectKVSQL(table: string, ids: string[]): string {
  return `SELECT id,v FROM ${table} where id in (${ids.map(id => `"${id}"`).join(',')})`
}

export function selectAllKeys(table: string): string {
  return `SELECT id FROM ${table}`
}
