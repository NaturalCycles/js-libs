import { Transform } from 'node:stream'
import type {
  AnyObject,
  AsyncFunction,
  CommonLogger,
  NullableBuffer,
  NullableString,
  Promisable,
  StringMap,
  UnixTimestamp,
} from '@naturalcycles/js-lib'
import { _stringMapEntries } from '@naturalcycles/js-lib'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib'
import type { Redis, RedisOptions } from 'ioredis'
import type { ScanStreamOptions } from 'ioredis/built/types.js'
import type { ChainableCommander } from 'ioredis/built/utils/RedisCommander.js'

export interface CommonClient extends AsyncDisposable {
  connected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  ping: () => Promise<void>
}

export interface RedisClientCfg {
  redisOptions?: RedisOptions

  /**
   * Defaults to console.
   */
  logger?: CommonLogger
}

/**
 Wraps the redis sdk with unified interface.
 Features:
 
 - Lazy loading & initialization
 - Reasonable defaults
 
 */
export class RedisClient implements CommonClient {
  constructor(cfg: RedisClientCfg = {}) {
    this.cfg = {
      logger: console,
      ...cfg,
      redisOptions: {
        showFriendlyErrorStack: true,
        lazyConnect: true,
        ...cfg.redisOptions,
      },
    }
  }

  cfg!: Required<RedisClientCfg>

  connected = false

  private _redis?: Redis

  async redis(): Promise<Redis> {
    if (this._redis) return this._redis

    // lazy-load the library
    const { default: redisLib } = await import('ioredis')
    const redis = new redisLib.Redis(this.cfg.redisOptions)

    const { logger } = this.cfg

    const redisEvents = ['connect', 'close', 'reconnecting', 'end']
    redisEvents.forEach(e => redis.on(e, () => logger.log(`redis: ${e}`)))

    const closeEvents: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']
    closeEvents.forEach(e => process.once(e, () => redis.quit()))

    redis.on('error', err => logger.error(err))

    this.connected = true
    this._redis = redis
    this.log(`redis: created`)
    return redis
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      const redis = await this.redis()
      await redis.connect()
      this.connected = true
    }
  }

  async disconnect(): Promise<void> {
    const redis = await this.redis()
    this.log('redis: quit...')
    this.log(`redis: quit`, await redis.quit())
    this.connected = false
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.disconnect()
  }

  async ping(): Promise<void> {
    const redis = await this.redis()
    await redis.ping()
  }

  async del(keys: string[]): Promise<number> {
    const redis = await this.redis()
    return await redis.del(keys)
  }

  async get(key: string): Promise<NullableString> {
    const redis = await this.redis()
    return await redis.get(key)
  }

  async getBuffer(key: string): Promise<NullableBuffer> {
    const redis = await this.redis()
    return await redis.getBuffer(key)
  }

  async mget(keys: string[]): Promise<NullableString[]> {
    const redis = await this.redis()
    return await redis.mget(keys)
  }

  async mgetBuffer(keys: string[]): Promise<NullableBuffer[]> {
    const redis = await this.redis()
    return await redis.mgetBuffer(keys)
  }

  async set(key: string, value: string | number | Buffer): Promise<void> {
    const redis = await this.redis()
    await redis.set(key, value)
  }

  async hgetall<T extends Record<string, string> = Record<string, string>>(
    key: string,
  ): Promise<T | null> {
    const redis = await this.redis()
    const result = await redis.hgetall(key)
    if (Object.keys(result).length === 0) return null
    return result as T
  }

  async hget(key: string, field: string): Promise<NullableString> {
    const redis = await this.redis()
    return await redis.hget(key, field)
  }

  async hset(key: string, value: AnyObject): Promise<void> {
    const redis = await this.redis()
    await redis.hset(key, value)
  }

  async hdel(key: string, fields: string[]): Promise<void> {
    const redis = await this.redis()
    await redis.hdel(key, ...fields)
  }

  async hmget(key: string, fields: string[]): Promise<NullableString[]> {
    const redis = await this.redis()
    return await redis.hmget(key, ...fields)
  }

  async hmgetBuffer(key: string, fields: string[]): Promise<NullableBuffer[]> {
    const redis = await this.redis()
    return await redis.hmgetBuffer(key, ...fields)
  }

  async hincr(key: string, field: string, increment = 1): Promise<number> {
    const redis = await this.redis()
    return await redis.hincrby(key, field, increment)
  }

  async hincrBatch(key: string, incrementTuples: [string, number][]): Promise<[string, number][]> {
    const results: StringMap<number | undefined> = {}

    await this.withPipeline(async pipeline => {
      for (const [field, increment] of incrementTuples) {
        pipeline.hincrby(key, field, increment, (_err, newValue) => {
          results[field] = newValue
        })
      }
    })

    const validResults = _stringMapEntries(results).filter(([_, v]) => v !== undefined) as [
      string,
      number,
    ][]

    return validResults
  }

  async setWithTTL(
    key: string,
    value: string | number | Buffer,
    expireAt: UnixTimestamp,
  ): Promise<void> {
    const redis = await this.redis()
    await redis.set(key, value, 'EXAT', expireAt)
  }

  async hsetWithTTL(_key: string, _value: AnyObject, _expireAt: UnixTimestamp): Promise<void> {
    throw new Error('Not supported until Redis 7.4.0')
    // const valueKeys = Object.keys(value)
    // const numberOfKeys = valueKeys.length
    // const keyList = valueKeys.join(' ')
    // const commandString = `HEXPIREAT ${key} ${expireAt} FIELDS ${numberOfKeys} ${keyList}`
    // const [command, ...args] = commandString.split(' ')
    // await redis.hset(key, value)
    // await redis.call(command!, args)
  }

  async mset(obj: Record<string, string | number>): Promise<void> {
    const redis = await this.redis()
    await redis.mset(obj)
  }

  async msetBuffer(obj: Record<string, Buffer>): Promise<void> {
    const redis = await this.redis()
    await redis.mset(obj)
  }

  async incr(key: string, by = 1): Promise<number> {
    const redis = await this.redis()
    return await redis.incrby(key, by)
  }

  async incrBatch(incrementTuples: [string, number][]): Promise<[string, number][]> {
    const results: StringMap<number | undefined> = {}

    await this.withPipeline(async pipeline => {
      for (const [key, increment] of incrementTuples) {
        pipeline.incrby(key, increment, (_err, newValue) => {
          results[key] = newValue
        })
      }
    })

    const validResults = _stringMapEntries(results).filter(([_, v]) => v !== undefined) as [
      string,
      number,
    ][]

    return validResults
  }

  async ttl(key: string): Promise<number> {
    const redis = await this.redis()
    return await redis.ttl(key)
  }

  async dropTable(table: string): Promise<void> {
    let count = 0

    await this.withPipeline(async pipeline => {
      await this.scanStream({
        match: `${table}:*`,
      }).forEach(keys => {
        pipeline.del(keys)
        count += keys.length
      })
    })

    this.log(`redis: dropped table ${table} (${count} keys)`)
  }

  async clearAll(): Promise<void> {
    this.log(`redis: clearAll...`)
    let count = 0

    await this.withPipeline(async pipeline => {
      await this.scanStream({
        match: `*`,
      }).forEach(keys => {
        pipeline.del(keys)
        count += keys.length
      })
    })

    this.log(`redis: clearAll removed ${count} keys`)
  }

  /**
   Convenient type-safe wrapper.
   Returns BATCHES of keys in each iteration (as-is).
   */
  scanStream(opt?: ScanStreamOptions): ReadableTyped<string[]> {
    return createReadableFromAsync(async () => {
      const redis = await this.redis()
      return redis.scanStream(opt)
    })
  }

  /**
   * Like scanStream, but flattens the stream of keys.
   */
  scanStreamFlat(opt: ScanStreamOptions): ReadableTyped<string> {
    // biome-ignore lint/correctness/noFlatMapIdentity: ok
    return this.scanStream(opt).flatMap(keys => keys)
  }

  async scanCount(opt: ScanStreamOptions): Promise<number> {
    const redis = await this.redis()
    // todo: implement more efficiently, e.g via LUA?
    let count = 0

    await (redis.scanStream(opt) as ReadableTyped<string[]>).forEach(keys => {
      count += keys.length
    })

    return count
  }

  hscanStream(key: string, opt?: ScanStreamOptions): ReadableTyped<string[]> {
    return createReadableFromAsync(async () => {
      const redis = await this.redis()
      return redis.hscanStream(key, opt)
    })
  }

  async hscanCount(key: string, opt?: ScanStreamOptions): Promise<number> {
    let count = 0

    const redis = await this.redis()
    const stream = redis.hscanStream(key, opt)

    await stream.forEach((keyValueList: string[]) => {
      count += keyValueList.length / 2
    })

    return count
  }

  async withPipeline(fn: (pipeline: ChainableCommander) => Promisable<void>): Promise<void> {
    const redis = await this.redis()
    const pipeline = redis.pipeline()
    await fn(pipeline)
    await pipeline.exec()
  }

  private log(...args: any[]): void {
    this.cfg.logger.log(...args)
  }
}

/**
 * Turn async function into Readable.
 */
function createReadableFromAsync<T>(fn: AsyncFunction<ReadableTyped<T>>): ReadableTyped<T> {
  const transform = new Transform({
    objectMode: true,
    transform: (chunk, _encoding, cb) => {
      cb(null, chunk)
    },
  })

  void fn()
    .then(readable => {
      readable.on('error', err => transform.emit('error', err)).pipe(transform)
    })
    .catch(err => transform.emit('error', err))

  return transform
}
