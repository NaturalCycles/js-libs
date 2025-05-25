import type {
  CommonDBCreateOptions,
  CommonKeyValueDB,
  CommonKeyValueDBSaveBatchOptions,
  IncrementTuple,
  KeyValueDBTuple,
} from '@naturalcycles/db-lib'
import { commonKeyValueDBFullSupport } from '@naturalcycles/db-lib'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib'
import type { RedisKeyValueDBCfg } from './redisKeyValueDB.js'

/**
 * RedisHashKeyValueDB is a KeyValueDB implementation that uses hash fields to simulate tables.
 * The value in the `table` arguments points to a hash field in Redis.
 *
 * The reason for having this approach and also the traditional RedisKeyValueDB is that
 * the currently available Redis versions (in Memorystore, or on MacOs) do not support
 * expiring hash properties.
 * The expiring fields feature is important, and only available via RedisKeyValueDB.
 *
 * Once the available Redis version reaches 7.4.0+,
 * this implementation can take over for RedisKeyValueDB.
 */
export class RedisHashKeyValueDB implements CommonKeyValueDB, AsyncDisposable {
  constructor(public cfg: RedisKeyValueDBCfg) {}

  support = {
    ...commonKeyValueDBFullSupport,
  }

  async ping(): Promise<void> {
    await this.cfg.client.ping()
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.cfg.client.disconnect()
  }

  async getByIds(table: string, ids: string[]): Promise<KeyValueDBTuple[]> {
    if (!ids.length) return []
    // we assume that the order of returned values is the same as order of input ids
    const bufs = await this.cfg.client.hmgetBuffer(table, ids)
    return bufs.map((buf, i) => [ids[i], buf] as KeyValueDBTuple).filter(([_k, v]) => v !== null)
  }

  async deleteByIds(table: string, ids: string[]): Promise<void> {
    if (!ids.length) return
    await this.cfg.client.hdel(table, ids)
  }

  async saveBatch(
    table: string,
    entries: KeyValueDBTuple[],
    opt?: CommonKeyValueDBSaveBatchOptions,
  ): Promise<void> {
    if (!entries.length) return

    const record = Object.fromEntries(entries)

    if (opt?.expireAt) {
      await this.cfg.client.hsetWithTTL(table, record, opt.expireAt)
    } else {
      await this.cfg.client.hset(table, record)
    }
  }

  streamIds(table: string, limit?: number): ReadableTyped<string> {
    const stream = this.cfg.client
      .hscanStream(table)
      .flatMap(keyValueList => {
        const keys: string[] = []
        for (let i = 0; i < keyValueList.length; i += 2) {
          keys.push(keyValueList[i]!)
        }
        return keys
      })
      .take(limit || Infinity)

    return stream
  }

  streamValues(table: string, limit?: number): ReadableTyped<Buffer> {
    return this.cfg.client
      .hscanStream(table)
      .flatMap(keyValueList => {
        const values: Buffer[] = []
        for (let i = 0; i < keyValueList.length; i += 2) {
          const value = Buffer.from(keyValueList[i + 1]!)
          values.push(value)
        }
        return values
      })
      .take(limit || Infinity)
  }

  streamEntries(table: string, limit?: number): ReadableTyped<KeyValueDBTuple> {
    return this.cfg.client
      .hscanStream(table)
      .flatMap(keyValueList => {
        const entries: [string, Buffer][] = []
        for (let i = 0; i < keyValueList.length; i += 2) {
          const key = keyValueList[i]!
          const value = Buffer.from(keyValueList[i + 1]!)
          entries.push([key, value])
        }
        return entries
      })
      .take(limit || Infinity)
  }

  async count(table: string): Promise<number> {
    return await this.cfg.client.hscanCount(table)
  }

  async incrementBatch(table: string, increments: IncrementTuple[]): Promise<IncrementTuple[]> {
    return await this.cfg.client.hincrBatch(table, increments)
  }

  async createTable(table: string, opt?: CommonDBCreateOptions): Promise<void> {
    if (!opt?.dropIfExists) return

    await this.cfg.client.del([table])
  }
}
