import { Readable } from 'node:stream'
import type { StringMap } from '@naturalcycles/js-lib/types'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib/stream'
import type { CommonDBCreateOptions } from '../db.model.js'
import type { CommonKeyValueDB, IncrementTuple, KeyValueDBTuple } from '../kv/commonKeyValueDB.js'
import { commonKeyValueDBFullSupport } from '../kv/commonKeyValueDB.js'

export interface InMemoryKeyValueDBCfg {}

export class InMemoryKeyValueDB implements CommonKeyValueDB {
  constructor(public cfg: InMemoryKeyValueDBCfg = {}) {}

  support = {
    ...commonKeyValueDBFullSupport,
  }

  // data[table][id] => any (can be Buffer, or number)
  data: StringMap<StringMap<any>> = {}

  async ping(): Promise<void> {}

  async createTable(_table: string, _opt?: CommonDBCreateOptions): Promise<void> {}

  async deleteByIds(table: string, ids: string[]): Promise<void> {
    this.data[table] ||= {}
    for (const id of ids) {
      delete this.data[table][id]
    }
  }

  async getByIds(table: string, ids: string[]): Promise<KeyValueDBTuple[]> {
    this.data[table] ||= {}
    return ids.map(id => [id, this.data[table]![id]!] as KeyValueDBTuple).filter(e => e[1])
  }

  async saveBatch(table: string, entries: KeyValueDBTuple[]): Promise<void> {
    this.data[table] ||= {}
    for (const [id, v] of entries) {
      this.data[table][id] = v
    }
  }

  streamIds(table: string, limit?: number): ReadableTyped<string> {
    return Readable.from(Object.keys(this.data[table] || {}).slice(0, limit))
  }

  streamValues(table: string, limit?: number): ReadableTyped<Buffer> {
    return Readable.from(Object.values(this.data[table] || {}).slice(0, limit))
  }

  streamEntries(table: string, limit?: number): ReadableTyped<KeyValueDBTuple> {
    return Readable.from(Object.entries(this.data[table] || {}).slice(0, limit))
  }

  async count(table: string): Promise<number> {
    this.data[table] ||= {}
    return Object.keys(this.data[table]).length
  }

  async incrementBatch(table: string, entries: IncrementTuple[]): Promise<IncrementTuple[]> {
    this.data[table] ||= {}

    return entries.map(([id, by]) => {
      const newValue = Number(this.data[table]![id] || 0) + by
      this.data[table]![id] = newValue
      return [id, newValue]
    })
  }
}
