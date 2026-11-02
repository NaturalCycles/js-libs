import type { DatastoreOptions, Key } from '@google-cloud/datastore'
import type {
  CommonDBOptions,
  CommonDBReadOptions,
  CommonDBSaveOptions,
} from '@naturalcycles/db-lib'
import type { CommonLogger, CommonLogLevel } from '@naturalcycles/js-lib/log'
import type { PRetryOptions } from '@naturalcycles/js-lib/promise'
import type { NumberOfSeconds, ObjectWithId, PositiveInteger } from '@naturalcycles/js-lib/types'

export interface DatastorePayload<T = any> {
  key: Key
  data: T
  excludeFromIndexes: string[]
}

/**
 * Extends DatastoreOptions by requiring needed properties.
 */
export interface DatastoreDBCfg extends DatastoreOptions {
  /**
   * Optional. AppEngine will infer projectId and credential automatically.
   */
  projectId?: string

  credentials?: DatastoreCredentials

  /**
   * As described here: https://github.com/googleapis/nodejs-pubsub/issues/770#issuecomment-541226361
   * Allows to set the old native library here, e.g `grpc: require('grpc')`
   */
  grpc?: any

  /**
   * Use it to set default options to stream operations,
   * e.g you can globally enable `experimentalCursorStream` here, set the batchSize, etc.
   */
  streamOptions?: DatastoreDBStreamOptions

  /**
   * Default to `consoleLogger`
   */
  logger?: CommonLogger

  /**
   * Defaults to `log`.
   */
  logLevel?: CommonLogLevel

  /**
   * Overrides the retry options that DatastoreDB applies to every Datastore operation
   * (getByIds, saveBatch, deleteByIds, etc). Merged over the defaults, so only the keys
   * you want to change need to be passed.
   *
   * Defaults depend on the environment:
   * - on Cloud Run (bound by the request timing constraints):
   *   `{ timeout: 20_000, maxAttempts: 3, delay: 1000 }`
   * - elsewhere (e.g CI, where we can afford to wait longer):
   *   `{ timeout: 60_000, maxAttempts: 5, delay: 5000 }`
   *
   * Common for both: `delayMultiplier: 1.5`, retries on TimeoutError and on known transient
   * Datastore errors (UNAVAILABLE, DEADLINE_EXCEEDED, ABORTED, etc).
   */
  retry?: Partial<PRetryOptions>
}

export interface DatastoreCredentials {
  type?: string
  client_email?: string
  private_key?: string
  private_key_id?: string
  project_id?: string
  client_id?: string
  client_secret?: string
  refresh_token?: string
}

export interface DatastoreDBStreamOptions extends DatastoreDBReadOptions {
  /**
   * Set to `true` to stream via experimental "cursor-query based stream".
   *
   * @default false
   */
  experimentalCursorStream?: boolean

  /**
   * Applicable to `experimentalCursorStream`.
   * Defines the size (limit) of each individual query.
   *
   * @default 1_000
   */
  batchSize?: PositiveInteger

  /**
   * Defaults to 3x batchSize.
   * Default batchSize is 1_000, so default highWaterMark is 3_000.
   * Controls how many rows to have "buffered".
   * Should be at least 1x batchSize, otherwise the stream will be "starving"
   * between the queries.
   */
  highWaterMark?: PositiveInteger

  logger?: CommonLogger

  /**
   * Defaults to `log`.
   * Set to `debug` to allow for extra debugging, e.g in experimentalCursorStream.
   */
  logLevel?: CommonLogLevel

  /**
   * Default is undefined.
   * If set - sets a "safety timer", which will force call _read after the specified number of seconds.
   * This is to prevent possible "dead-lock"/race-condition that would make the stream "hang".
   *
   * @experimental
   */
  maxWait?: NumberOfSeconds
}

export interface DatastoreDBOptions extends CommonDBOptions {}

export interface DatastoreDBReadOptions extends CommonDBReadOptions {}

export interface DatastoreDBSaveOptions<
  ROW extends ObjectWithId,
> extends CommonDBSaveOptions<ROW> {}

export interface DatastoreStats {
  composite_index_count: number
  builtin_index_count: number
  kind_name: string
  bytes: number
  entity_bytes: number
  count: number
}

export enum DatastoreType {
  Blob = 'Blob',
  Text = 'Text',
  String = 'String',
  EmbeddedEntity = 'EmbeddedEntity',
  Float = 'Float',
  Integer = 'Integer',
  DATE_TIME = 'Date/Time',
  Boolean = 'Boolean',
  NULL = 'NULL',
}

export interface DatastorePropertyStats {
  kind_name: string
  property_name: string
  property_type: DatastoreType
  count: number
  bytes: number
  entity_bytes: number
  builtin_index_count: number
  // timestamp: 2019-11-06T09:04:18.000Z,
  builtin_index_bytes: number
}
