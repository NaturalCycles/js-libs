import type { CommonLogger } from '@naturalcycles/js-lib/log'
import type { AnyObject, ObjectWithId } from '@naturalcycles/js-lib/types'
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
   * Creates the cacheDB of one cache scope.
   * CacheDB returns copies of the cache hits.
   * Exception: the `__compressed` Buffer (see CommonDao `compress`) is shared, not copied.
   *
   * `undefined` means NoopDB: reads return nothing and writes are ignored.
   */
  createCacheDB?: () => CommonDB

  getCacheScope?: () => AnyObject | undefined

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

export type CacheFillToken = unknown

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
