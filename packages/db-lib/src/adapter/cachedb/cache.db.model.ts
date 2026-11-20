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
   * Expects an "identifier" for the current scope of the cache.
   * For each distinct identifier a new cache is created via `createCacheDB`.
   * By returning the same scope object you effectively use a single cache.
   * By returning a request-bound object you achieve request-bound caching.
   * By returning `undefined` no cache will be used.
   */
  getCacheScope?: () => AnyObject | undefined

  /**
   * Creates the cacheDB of one cache scope.
   * CacheDB returns copies of the cache hits so the DB implementation does not need to.
   * Exception: `__compressed` - the Buffer in `__compressed` is shared between copies.
   */
  createCacheDB?: () => CommonDB

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
