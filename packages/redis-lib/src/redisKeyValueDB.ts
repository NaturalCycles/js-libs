import type {
  CommonDBCreateOptions,
  CommonKeyValueDB,
  CommonKeyValueDBSaveBatchOptions,
  IncrementTuple,
  KeyValueDBTuple,
} from '@naturalcycles/db-lib'
import { commonKeyValueDBFullSupport } from '@naturalcycles/db-lib'
import { _isTruthy, _zip } from '@naturalcycles/js-lib'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib'
import type { RedisClient } from './redisClient.js'

export interface RedisKeyValueDBCfg {
  client: RedisClient
}

export class RedisKeyValueDB implements CommonKeyValueDB, AsyncDisposable {
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
    const bufs = await this.cfg.client.mgetBuffer(this.idsToKeys(table, ids))
    return bufs.map((buf, i) => [ids[i], buf] as KeyValueDBTuple).filter(([_k, v]) => v !== null)
  }

  async deleteByIds(table: string, ids: string[]): Promise<void> {
    if (!ids.length) return
    await this.cfg.client.del(this.idsToKeys(table, ids))
  }

  async saveBatch(
    table: string,
    entries: KeyValueDBTuple[],
    opt?: CommonKeyValueDBSaveBatchOptions,
  ): Promise<void> {
    if (!entries.length) return

    if (opt?.expireAt) {
      // There's no supported mset with TTL: https://stackoverflow.com/questions/16423342/redis-multi-set-with-a-ttl
      // so we gonna use a pipeline instead
      await this.cfg.client.withPipeline(pipeline => {
        for (const [k, v] of entries) {
          pipeline.set(this.idToKey(table, k), v, 'EXAT', opt.expireAt!)
        }
      })
    } else {
      const obj: Record<string, Buffer> = Object.fromEntries(
        entries.map(([k, v]) => [this.idToKey(table, k), v]) as KeyValueDBTuple[],
      )
      await this.cfg.client.msetBuffer(obj)
    }
  }

  streamIds(table: string, limit?: number): ReadableTyped<string> {
    let stream = this.cfg.client
      .scanStream({
        match: `${table}:*`,
        // count: limit, // count is actually a "batchSize", not a limit
      })
      .flatMap(keys => this.keysToIds(table, keys))

    if (limit) {
      stream = stream.take(limit)
    }

    return stream
  }

  streamValues(table: string, limit?: number): ReadableTyped<Buffer> {
    return this.cfg.client
      .scanStream({
        match: `${table}:*`,
      })
      .flatMap(
        async keys => {
          return (await this.cfg.client.mgetBuffer(keys)).filter(_isTruthy)
        },
        {
          concurrency: 16,
        },
      )
      .take(limit || Infinity)
  }

  streamEntries(table: string, limit?: number): ReadableTyped<KeyValueDBTuple> {
    return this.cfg.client
      .scanStream({
        match: `${table}:*`,
      })
      .flatMap(
        async keys => {
          // casting as Buffer[], because values are expected to exist for given keys
          const bufs = (await this.cfg.client.mgetBuffer(keys)) as Buffer[]
          return _zip(this.keysToIds(table, keys), bufs)
        },
        {
          concurrency: 16,
        },
      )
      .take(limit || Infinity)
  }

  async count(table: string): Promise<number> {
    // todo: implement more efficiently, e.g via LUA?
    return await this.cfg.client.scanCount({
      match: `${table}:*`,
    })
  }

  async incrementBatch(table: string, increments: IncrementTuple[]): Promise<IncrementTuple[]> {
    const incrementTuplesWithInternalKeys = increments.map(
      ([id, v]) => [this.idToKey(table, id), v] as [string, number],
    )
    const resultsWithInternalKeys = await this.cfg.client.incrBatch(incrementTuplesWithInternalKeys)
    const results = resultsWithInternalKeys.map(
      ([k, v]) => [this.keyToId(table, k), v] as IncrementTuple,
    )
    return results
  }

  async createTable(table: string, opt?: CommonDBCreateOptions): Promise<void> {
    if (!opt?.dropIfExists) return

    await this.cfg.client.dropTable(table)
  }

  private idsToKeys(table: string, ids: string[]): string[] {
    return ids.map(id => this.idToKey(table, id))
  }

  private idToKey(table: string, id: string): string {
    return `${table}:${id}`
  }

  private keysToIds(table: string, keys: string[]): string[] {
    return keys.map(key => this.keyToId(table, key))
  }

  private keyToId(table: string, key: string): string {
    return key.slice(table.length + 1)
  }
}
