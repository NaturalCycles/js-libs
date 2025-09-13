import type { JsonSchemaObject, JsonSchemaRootObject } from '@naturalcycles/js-lib/json-schema'
import type { NonNegativeInteger, ObjectWithId, StringMap } from '@naturalcycles/js-lib/types'
import type { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import type {
  CommonDBCreateOptions,
  CommonDBOptions,
  CommonDBReadOptions,
  CommonDBSaveOptions,
  CommonDBStreamOptions,
  CommonDBTransactionOptions,
  DBTransaction,
  DBTransactionFn,
  RunQueryResult,
} from '../db.model.js'
import type { DBQuery } from '../query/dbQuery.js'

export interface CommonDB {
  /**
   * Relational databases are expected to return `null` for all missing properties.
   */
  dbType: CommonDBType

  /**
   * Manifest of supported features.
   */
  support: CommonDBSupport

  /**
   * Checks that connection/credentials/etc is ok.
   * Also acts as a "warmup request" for a DB.
   * It SHOULD fail if DB setup is wrong (e.g on wrong credentials).
   * It SHOULD succeed if e.g getByIds(['nonExistingKey']) doesn't throw.
   */
  ping: () => Promise<void>

  /**
   * Return all tables (table names) available in this DB.
   */
  getTables: () => Promise<string[]>

  /**
   * $id of the schema SHOULD be like this:
   * `${tableName}.schema.json`
   *
   * This is important for the code to rely on it, and it's verified by dbTest
   */
  getTableSchema: <ROW extends ObjectWithId>(table: string) => Promise<JsonSchemaRootObject<ROW>>

  /**
   * Will do like `create table ...` for mysql.
   * Caution! dropIfExists defaults to false. If set to true - will actually DROP the table!
   */
  createTable: <ROW extends ObjectWithId>(
    table: string,
    schema: JsonSchemaObject<ROW>,
    opt?: CommonDBCreateOptions,
  ) => Promise<void>

  // GET
  /**
   * Order of items returned is not guaranteed to match order of ids.
   * (Such limitation exists because Datastore doesn't support it).
   */
  getByIds: <ROW extends ObjectWithId>(
    table: string,
    ids: string[],
    opt?: CommonDBReadOptions,
  ) => Promise<ROW[]>

  /**
   * Get rows from multiple tables at once.
   * Mimics the API of some NoSQL databases like Firestore.
   *
   * Takes `map`, which is a map from "table name" to an array of ids.
   * Example:
   * {
   *   'TableOne': ['id1', 'id2'],
   *   'TableTwo': ['id3'],
   * }
   *
   * Returns a map with the same keys (table names) and arrays of rows as values.
   * Even if some table is not found, it will return an empty array of results for that table.
   *
   * @experimental
   */
  multiGet: <ROW extends ObjectWithId>(
    idsByTable: StringMap<string[]>,
    opt?: CommonDBReadOptions,
  ) => Promise<StringMap<ROW[]>>

  // QUERY
  /**
   * Order by 'id' is not supported by all implementations (for example, Datastore doesn't support it).
   */
  runQuery: <ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt?: CommonDBReadOptions,
  ) => Promise<RunQueryResult<ROW>>

  runQueryCount: <ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt?: CommonDBReadOptions,
  ) => Promise<NonNegativeInteger>

  streamQuery: <ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt?: CommonDBStreamOptions,
  ) => Pipeline<ROW>

  // SAVE
  /**
   * rows can have missing ids only if DB supports auto-generating them (like mysql auto_increment).
   */
  saveBatch: <ROW extends ObjectWithId>(
    table: string,
    rows: ROW[],
    opt?: CommonDBSaveOptions<ROW>,
  ) => Promise<void>

  /**
   * Save rows for multiple tables at once.
   * Mimics the API of some NoSQL databases like Firestore.
   *
   * Takes `map`, which is a map from "table name" to an array of rows.
   * Example:
   * {
   *  'TableOne': [{ id: 'id1', ... }, { id: 'id2', ... }],
   *  'TableTwo': [{ id: 'id3', ... }],
   * }
   *
   * @experimental
   */
  multiSave: <ROW extends ObjectWithId>(
    rowsByTable: StringMap<ROW[]>,
    opt?: CommonDBSaveOptions<ROW>,
  ) => Promise<void>

  /**
   * Perform a partial update of a row by its id.
   * Unlike save - doesn't require to first load the doc.
   * Mimics the API of some NoSQL databases like Firestore.
   *
   * The object with given id has to exist, otherwise an error will be thrown.
   *
   * @experimental
   */
  patchById: <ROW extends ObjectWithId>(
    table: string,
    id: string,
    patch: Partial<ROW>,
    opt?: CommonDBOptions,
  ) => Promise<void>

  // DELETE
  /**
   * Returns number of deleted items.
   * Not supported by all implementations (e.g Datastore will always return same number as number of ids).
   */
  deleteByIds: (table: string, ids: string[], opt?: CommonDBOptions) => Promise<NonNegativeInteger>

  /**
   * Deletes rows from multiple tables at once.
   * Mimics the API of some NoSQL databases like Firestore.
   * Takes `map`, which is a map from "table name" to an array of ids to delete.
   * Example:
   * {
   *  'TableOne': ['id1', 'id2'],
   *  'TableTwo': ['id3'],
   * }
   *
   * Returns number of deleted items.
   * Not supported by all implementations (e.g Datastore will always return same number as number of ids).
   *
   * @experimental
   */
  multiDelete: (
    idsByTable: StringMap<string[]>,
    opt?: CommonDBOptions,
  ) => Promise<NonNegativeInteger>

  /**
   * Returns number of deleted items.
   * Not supported by all implementations (e.g Datastore will always return same number as number of ids).
   */
  deleteByQuery: <ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    opt?: CommonDBOptions,
  ) => Promise<NonNegativeInteger>

  /**
   * Applies patch to all the rows that are matched by the query.
   *
   * Example:
   *
   * UPDATE table SET A = B where $QUERY_CONDITION
   *
   * patch would be { A: 'B' } for that query.
   *
   * Returns the number of rows affected.
   */
  patchByQuery: <ROW extends ObjectWithId>(
    q: DBQuery<ROW>,
    patch: Partial<ROW>,
    opt?: CommonDBReadOptions,
  ) => Promise<number>

  // TRANSACTION
  /**
   * Should be implemented as a Transaction (best effort), which means that
   * either ALL or NONE of the operations should be applied.
   *
   * Transaction is automatically committed if fn resolves normally.
   * Transaction is rolled back if fn throws, the error is re-thrown in that case.
   * Graceful rollback is allowed on tx.rollback()
   *
   * By default, transaction is read-write,
   * unless specified as readOnly in CommonDBTransactionOptions.
   */
  runInTransaction: (fn: DBTransactionFn, opt?: CommonDBTransactionOptions) => Promise<void>

  /**
   * Experimental API to support more manual transaction control.
   *
   * @experimental
   */
  createTransaction: (opt?: CommonDBTransactionOptions) => Promise<DBTransaction>

  /**
   * Increments a value of a property by a given amount.
   * This is a batch operation, so it allows to increment multiple rows at once.
   *
   * - table - the table to apply operations on
   * - prop - name of the property to increment (in each of the rows passed)
   * - incrementMap - map from id to increment value
   *
   * Example of incrementMap:
   * { rowId1: 2, rowId2: 3 }
   *
   * Returns the incrementMap with the same keys and updated values.
   *
   * @experimental
   */
  incrementBatch: (
    table: string,
    prop: string,
    incrementMap: StringMap<number>,
    opt?: CommonDBOptions,
  ) => Promise<StringMap<number>>
}

export enum CommonDBType {
  'document' = 'document',
  'relational' = 'relational',
}

/**
 * Manifest of supported features.
 */
export interface CommonDBSupport {
  queries?: boolean
  dbQueryFilter?: boolean
  dbQueryFilterIn?: boolean
  dbQueryOrder?: boolean
  dbQuerySelectFields?: boolean
  insertSaveMethod?: boolean
  updateSaveMethod?: boolean
  patchByQuery?: boolean
  patchById?: boolean
  increment?: boolean
  createTable?: boolean
  tableSchemas?: boolean
  streaming?: boolean
  bufferValues?: boolean
  nullValues?: boolean
  transactions?: boolean
  createTransaction?: boolean
  timeMachine?: boolean
  multiTableOperations?: boolean
}

export const commonDBFullSupport: Required<CommonDBSupport> = {
  queries: true,
  dbQueryFilter: true,
  dbQueryFilterIn: true,
  dbQueryOrder: true,
  dbQuerySelectFields: true,
  insertSaveMethod: true,
  updateSaveMethod: true,
  patchByQuery: true,
  patchById: true,
  increment: true,
  createTable: true,
  tableSchemas: true,
  streaming: true,
  bufferValues: true,
  nullValues: true,
  transactions: true,
  createTransaction: true,
  timeMachine: true,
  multiTableOperations: true,
}
