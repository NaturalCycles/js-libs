import type { JsonSchemaObject, JsonSchemaRootObject } from '@naturalcycles/js-lib/json-schema'
import type { ObjectWithId, StringMap } from '@naturalcycles/js-lib/types'
import type { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import type {
  CommonDBOptions,
  CommonDBReadOptions,
  CommonDBSaveOptions,
  CommonDBTransactionOptions,
  DBTransaction,
  DBTransactionFn,
  RunQueryResult,
} from '../db.model.js'
import type { DBQuery } from '../query/dbQuery.js'
import { FakeDBTransaction } from '../transaction/dbTransaction.util.js'
import type { CommonDB, CommonDBSupport } from './common.db.js'
import { CommonDBType } from './common.db.js'

/**
 * No-op implementation of CommonDB interface.
 * To be extended by actual implementations.
 */
export class BaseCommonDB implements CommonDB {
  dbType = CommonDBType.document

  support: CommonDBSupport = {}

  async ping(): Promise<void> {
    throw new Error('ping is not implemented')
  }

  async getTables(): Promise<string[]> {
    throw new Error('getTables is not implemented')
  }

  async getTableSchema<ROW extends ObjectWithId>(
    _table: string,
  ): Promise<JsonSchemaRootObject<ROW>> {
    throw new Error('getTableSchema is not implemented')
  }

  async createTable<ROW extends ObjectWithId>(
    _table: string,
    _schema: JsonSchemaObject<ROW>,
  ): Promise<void> {
    // no-op
  }

  async getByIds<ROW extends ObjectWithId>(_table: string, _ids: string[]): Promise<ROW[]> {
    throw new Error('getByIds is not implemented')
  }

  async deleteByQuery<ROW extends ObjectWithId>(_q: DBQuery<ROW>): Promise<number> {
    throw new Error('deleteByQuery is not implemented')
  }

  async patchByQuery<ROW extends ObjectWithId>(
    _q: DBQuery<ROW>,
    _patch: Partial<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<number> {
    throw new Error('patchByQuery is not implemented')
  }

  async patchById<ROW extends ObjectWithId>(
    _table: string,
    _id: string,
    _patch: Partial<ROW>,
    _opt?: CommonDBOptions,
  ): Promise<void> {
    throw new Error('patchById is not implemented')
  }

  async runQuery<ROW extends ObjectWithId>(_q: DBQuery<ROW>): Promise<RunQueryResult<ROW>> {
    throw new Error('runQuery is not implemented')
  }

  async runQueryCount<ROW extends ObjectWithId>(_q: DBQuery<ROW>): Promise<number> {
    throw new Error('runQueryCount is not implemented')
  }

  async saveBatch<ROW extends ObjectWithId>(
    _table: string,
    _rows: ROW[],
    _opt?: CommonDBSaveOptions<ROW>,
  ): Promise<void> {
    throw new Error('saveBatch is not implemented')
  }

  streamQuery<ROW extends ObjectWithId>(_q: DBQuery<ROW>): Pipeline<ROW> {
    throw new Error('streamQuery is not implemented')
  }

  async deleteByIds(_table: string, _ids: string[], _opt?: CommonDBOptions): Promise<number> {
    throw new Error('deleteByIds is not implemented')
  }

  async runInTransaction(fn: DBTransactionFn, _opt?: CommonDBTransactionOptions): Promise<void> {
    const tx = new FakeDBTransaction(this)
    await fn(tx)
    // there's no try/catch and rollback, as there's nothing to rollback
  }

  async createTransaction(_opt?: CommonDBTransactionOptions): Promise<DBTransaction> {
    return new FakeDBTransaction(this)
  }

  async incrementBatch(
    _table: string,
    _prop: string,
    _incrementMap: StringMap<number>,
    _opt?: CommonDBOptions,
  ): Promise<StringMap<number>> {
    throw new Error('incrementBatch is not implemented')
  }

  async multiGet<ROW extends ObjectWithId>(
    _map: StringMap<string[]>,
    _opt?: CommonDBReadOptions,
  ): Promise<StringMap<ROW[]>> {
    throw new Error('multiGetByIds is not implemented')
  }

  async multiSave<ROW extends ObjectWithId>(
    _map: StringMap<ROW[]>,
    _opt?: CommonDBSaveOptions<ROW>,
  ): Promise<void> {
    throw new Error('multiSaveBatch is not implemented')
  }

  async multiDelete(_map: StringMap<string[]>, _opt?: CommonDBOptions): Promise<number> {
    throw new Error('multiDeleteByIds is not implemented')
  }
}
