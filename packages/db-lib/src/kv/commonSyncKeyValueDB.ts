import type { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import type { CommonDBCreateOptions } from '../db.model.js'
import type {
  CommonKeyValueDBSaveBatchOptions,
  CommonKeyValueDBSupport,
  IncrementTuple,
  KeyValueDBTuple,
} from './commonKeyValueDB.js'

/**
 * Common interface for Synchronous Key-Value database implementations.
 * Same as CommonKeyValueDB, but with a sync implementation,
 * modeled after e.g SQLite in Node.js, which is designed to be sync.
 *
 * Methods use `Sync` postfix to allow one implementation to support
 * both async and sync CommonKeyValueDB interfaces.
 *
 * @experimental
 */
export interface CommonSyncKeyValueDB {
  /**
   * Manifest of supported features.
   */
  support: CommonKeyValueDBSupport

  /**
   * Check that DB connection is working properly.
   */
  pingSync: () => void

  /**
   * Will do like `create table ...` for mysql.
   * Caution! dropIfExists defaults to false. If set to true - will actually DROP the table!
   */
  createTableSync: (table: string, opt?: CommonDBCreateOptions) => void

  /**
   * Returns an array of tuples [key, value]. Not found values are not returned (no error is thrown).
   *
   * Currently it is NOT required to maintain the same order as input `ids`.
   */
  getByIdsSync: (table: string, ids: string[]) => KeyValueDBTuple[]

  deleteByIdsSync: (table: string, ids: string[]) => void

  saveBatchSync: (
    table: string,
    entries: KeyValueDBTuple[],
    opt?: CommonKeyValueDBSaveBatchOptions,
  ) => void

  streamIds: (table: string, limit?: number) => Pipeline<string>
  streamValues: (table: string, limit?: number) => Pipeline<Buffer>
  streamEntries: (table: string, limit?: number) => Pipeline<KeyValueDBTuple>

  countSync: (table: string) => number

  /**
   * Perform a batch of Increment operations.
   * Given entries array, increment each key of it (1st index of the tuple) by the given amount (2nd index of the tuple).
   *
   * Example:
   * [
   *   ['key1', 2],
   *   ['key2', 3],
   * ]
   * would increment `key1` by 2, and `key2` by 3.
   *
   * Returns the entries array with tuples of the same structure, with updated numbers.
   *
   * @experimental
   */
  incrementBatchSync: (table: string, entries: IncrementTuple[]) => IncrementTuple[]
}
