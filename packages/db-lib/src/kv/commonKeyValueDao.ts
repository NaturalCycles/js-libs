import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import type { CommonLogger } from '@naturalcycles/js-lib/log'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import { type KeyValueTuple, SKIP } from '@naturalcycles/js-lib/types'
import type { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import {
  decompressZstdOrInflateToString,
  deflateString,
  inflateToString,
  zstdCompress,
  zstdDecompressToString,
} from '@naturalcycles/nodejs-lib/zip'
import type { CommonDaoLogLevel } from '../commondao/common.dao.model.js'
import type { CommonDBCreateOptions } from '../db.model.js'
import type {
  CommonKeyValueDB,
  CommonKeyValueDBSaveBatchOptions,
  IncrementTuple,
  KeyValueDBTuple,
} from './commonKeyValueDB.js'

export interface CommonKeyValueDaoCfg<V> {
  db: CommonKeyValueDB

  table: string

  /**
   * @default to false
   * Set to true to limit DB writing (will throw an error is such case).
   */
  readOnly?: boolean

  /**
   * Default to console
   */
  logger?: CommonLogger

  /**
   * @default OPERATIONS
   */
  logLevel?: CommonDaoLogLevel

  /**
   * @default false
   */
  logStarted?: boolean

  transformer?: CommonKeyValueDaoTransformer<V>
}

export type CommonKeyValueDaoSaveOptions = CommonKeyValueDBSaveBatchOptions

export interface CommonKeyValueDaoTransformer<V> {
  valueToBuffer: (v: V) => Promise<Buffer>
  bufferToValue: (buf: Buffer) => Promise<V>
}

export const commonKeyValueDaoDeflatedJsonTransformer: CommonKeyValueDaoTransformer<any> = {
  valueToBuffer: async v => await deflateString(JSON.stringify(v)),
  bufferToValue: async buf => JSON.parse(await inflateToString(buf)),
}

export const commonKeyValueDaoZstdJsonTransformer: CommonKeyValueDaoTransformer<any> = {
  valueToBuffer: async v => await zstdCompress(JSON.stringify(v)),
  bufferToValue: async buf => JSON.parse(await zstdDecompressToString(buf)),
}

/**
 * Saves: zstd
 * Reads: zstd or deflate (backwards compatible)
 */
export const commonKeyValueDaoCompressedTransformer: CommonKeyValueDaoTransformer<any> = {
  valueToBuffer: async v => await zstdCompress(JSON.stringify(v)),
  bufferToValue: async buf => JSON.parse(await decompressZstdOrInflateToString(buf)),
}

// todo: logging
// todo: readonly

export class CommonKeyValueDao<K extends string = string, V = Buffer> {
  constructor(cfg: CommonKeyValueDaoCfg<V>) {
    this.cfg = {
      logger: console,
      ...cfg,
    }
  }

  cfg: CommonKeyValueDaoCfg<V> & {
    logger: CommonLogger
  }

  async ping(): Promise<void> {
    await this.cfg.db.ping()
  }

  async createTable(opt: CommonDBCreateOptions = {}): Promise<void> {
    await this.cfg.db.createTable(this.cfg.table, opt)
  }

  async getById(id?: K): Promise<V | null> {
    if (!id) return null
    const [r] = await this.getByIds([id])
    return r?.[1] || null
  }

  async getByIdAsBuffer(id?: K): Promise<Buffer | null> {
    if (!id) return null
    const [r] = await this.cfg.db.getByIds(this.cfg.table, [id])
    return r?.[1] || null
  }

  async requireById(id: K): Promise<V> {
    const [r] = await this.getByIds([id])

    if (!r) {
      const { table } = this.cfg
      throw new AppError(`DB row required, but not found in ${table}`, {
        table,
        id,
      })
    }

    return r[1]
  }

  async requireByIdAsBuffer(id: K): Promise<Buffer> {
    const [r] = await this.cfg.db.getByIds(this.cfg.table, [id])

    if (!r) {
      const { table } = this.cfg
      throw new AppError(`DB row required, but not found in ${table}`, {
        table,
        id,
      })
    }

    return r[1]
  }

  async getByIds(ids: K[]): Promise<KeyValueTuple<string, V>[]> {
    const entries = await this.cfg.db.getByIds(this.cfg.table, ids)
    if (!this.cfg.transformer) return entries as any

    return await pMap(entries, async ([id, raw]) => [
      id,
      await this.cfg.transformer!.bufferToValue(raw),
    ])
  }

  async getByIdsAsBuffer(ids: K[]): Promise<KeyValueDBTuple[]> {
    return await this.cfg.db.getByIds(this.cfg.table, ids)
  }

  async save(id: K, value: V, opt?: CommonKeyValueDaoSaveOptions): Promise<void> {
    await this.saveBatch([[id, value]], opt)
  }

  async saveBatch(
    entries: KeyValueTuple<K, V>[],
    opt?: CommonKeyValueDaoSaveOptions,
  ): Promise<void> {
    const { transformer } = this.cfg
    let rawEntries: KeyValueDBTuple[]

    if (!transformer) {
      rawEntries = entries as any
    } else {
      rawEntries = await pMap(entries, async ([id, v]) => [id, await transformer.valueToBuffer(v)])
    }

    await this.cfg.db.saveBatch(this.cfg.table, rawEntries, opt)
  }

  async deleteByIds(ids: K[]): Promise<void> {
    await this.cfg.db.deleteByIds(this.cfg.table, ids)
  }

  async deleteById(id: K): Promise<void> {
    await this.cfg.db.deleteByIds(this.cfg.table, [id])
  }

  streamIds(limit?: number): Pipeline<K> {
    return this.cfg.db.streamIds(this.cfg.table, limit) as Pipeline<K>
  }

  streamValues(limit?: number): Pipeline<V> {
    const { transformer } = this.cfg

    if (!transformer) {
      return this.cfg.db.streamValues(this.cfg.table, limit) as Pipeline<V>
    }

    return this.cfg.db.streamValues(this.cfg.table, limit).map(
      async buf => {
        try {
          return await transformer.bufferToValue(buf)
        } catch (err) {
          this.cfg.logger.error(err)
          return SKIP
        }
      },
      { concurrency: 32 },
    )
  }

  streamEntries(limit?: number): Pipeline<KeyValueTuple<K, V>> {
    const { transformer } = this.cfg

    if (!transformer) {
      return this.cfg.db.streamEntries(this.cfg.table, limit) as Pipeline<KeyValueTuple<K, V>>
    }

    return this.cfg.db.streamEntries(this.cfg.table, limit).map(
      async ([id, buf]) => {
        try {
          return [id as K, await transformer.bufferToValue(buf)]
        } catch (err) {
          this.cfg.logger.error(err)
          return SKIP
        }
      },
      { concurrency: 32 },
    )
  }

  async getAllKeys(limit?: number): Promise<K[]> {
    return await this.streamIds(limit).toArray()
  }

  async getAllValues(limit?: number): Promise<V[]> {
    return await this.streamValues(limit).toArray()
  }

  async getAllEntries(limit?: number): Promise<KeyValueTuple<K, V>[]> {
    return await this.streamEntries(limit).toArray()
  }

  /**
   * Increments the `id` field by the amount specified in `by`,
   * or by 1 if `by` is not specified.
   *
   * Returns the new value of the field.
   */
  async increment(id: K, by = 1): Promise<number> {
    const [t] = await this.cfg.db.incrementBatch(this.cfg.table, [[id, by]])
    return t![1]
  }

  async incrementBatch(entries: IncrementTuple[]): Promise<IncrementTuple[]> {
    return await this.cfg.db.incrementBatch(this.cfg.table, entries)
  }
}
