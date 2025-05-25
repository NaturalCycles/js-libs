import type { DatastoreOptions, Key } from '@google-cloud/datastore'
import type {
  CommonDBOptions,
  CommonDBReadOptions,
  CommonDBSaveOptions,
} from '@naturalcycles/db-lib'
import type { CommonLogger, NumberOfSeconds, ObjectWithId } from '@naturalcycles/js-lib'

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
   * Default to `console`
   */
  logger?: CommonLogger

  /**
   * Experimental option, currently only applies to `getByIds`.
   * Applies pTimeout to Datastore operation, re-creates Datastore on any error.
   *
   * @experimental
   */
  timeout?: number
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
   * @default 1000
   */
  batchSize?: number

  /**
   * Applicable to `experimentalCursorStream`
   *
   * Set to a value (number of Megabytes) to control the peak RSS size.
   * If limit is reached - streaming will pause until the stream keeps up, and then
   * resumes.
   *
   * Set to 0/undefined to disable. Stream will get "slow" then, cause it'll only run the query
   * when _read is called.
   *
   * @default 1000
   */
  rssLimitMB?: number

  /**
   * Applicable to `experimentalCursorStream`
   * Default false.
   * If true, stream will pause until consumer requests more data (via _read).
   * It means it'll run slower, as buffer will be equal to batchSize (1000) at max.
   * There will be gaps in time between "last query loaded" and "next query requested".
   * This mode is useful e.g for DB migrations, where you want to avoid "stale data".
   * So, it minimizes the time between "item loaded" and "item saved" during DB migration.
   */
  singleBatchBuffer?: boolean

  /**
   * Set to `true` to log additional debug info, when using experimentalCursorStream.
   *
   * @default false
   */
  debug?: boolean

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

export interface DatastoreDBSaveOptions<ROW extends ObjectWithId>
  extends CommonDBSaveOptions<ROW> {}

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
  String = 'String', // eslint-disable-line id-blacklist
  EmbeddedEntity = 'EmbeddedEntity',
  Float = 'Float',
  Integer = 'Integer',
  DATE_TIME = 'Date/Time',
  Boolean = 'Boolean', // eslint-disable-line id-blacklist
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
