import type { CommonLogger } from '@naturalcycles/js-lib/log'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import type { CommonDB } from '../../commondb/common.db.js'
import type {
  CommonDBCreateOptions,
  CommonDBOptions,
  CommonDBReadOptions,
  CommonDBSaveOptions,
  CommonDBStreamOptions,
} from '../../db.model.js'

export interface CacheDBCfg {
  /**
   * CacheDB returns cache hits as the cacheDB returns them, without a copy.
   * The cacheDB must return new objects on every read (a remote store does this),
   * otherwise a caller that mutates a returned row changes the row for all later readers.
   * InMemoryDB returns its stored objects, so use it as cacheDB only in tests.
   *
   * `undefined` means NoopDB: reads return nothing and writes are ignored.
   */
  cacheDB: CommonDB | undefined

  downstreamDB: CommonDB

  /**
   * If true - cache SAVING operations will await to be completed,
   * otherwise will be executed async
   *
   * @default false
   */
  awaitCache?: boolean

  /**
   * Global default.
   *
   * @default false
   */
  skipCache?: boolean

  /**
   * Global default.
   *
   * @default false
   */
  onlyCache?: boolean

  /**
   * @default false
   */
  logCached?: boolean

  /**
   * @default false
   */
  logDownstream?: boolean

  /**
   * Defaults to `consoleLogger`.
   */
  logger?: CommonLogger
}

export interface CacheDBOptions extends CommonDBOptions {
  /**
   * @default false
   */
  skipCache?: boolean

  /**
   * @default false
   */
  onlyCache?: boolean
}

export interface CacheDBReadOptions extends CacheDBOptions, CommonDBReadOptions {}

export interface CacheDBSaveOptions<ROW extends ObjectWithId>
  extends CacheDBOptions, CommonDBSaveOptions<ROW> {}

export interface CacheDBStreamOptions extends CacheDBOptions, CommonDBStreamOptions {}

export interface CacheDBCreateOptions extends CacheDBOptions, CommonDBCreateOptions {}
