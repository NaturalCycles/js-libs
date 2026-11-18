import type { ObjectWithId, StringMap } from '@naturalcycles/js-lib/types'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import { generateJsonSchemaFromData } from '@naturalcycles/nodejs-lib/ajv'
import { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import type { CommonDB, CommonDBSupport } from '../../commondb/common.db.js'
import { commonDBFullSupport, CommonDBType } from '../../commondb/common.db.js'
import type { DBTransaction, DBTransactionFn, RunQueryResult } from '../../db.model.js'
import type { DBQuery } from '../../query/dbQuery.js'
import { FakeDBTransaction } from '../../transaction/dbTransaction.util.js'

/**
 * Does not extend BaseCommonDB so when a new function is added to it,
 * we get a type error here and we are forced to think about how it should work with.
 */
export class NoopDB implements CommonDB {
  dbType = CommonDBType.document

  support: CommonDBSupport = {
    ...commonDBFullSupport,
    timeMachine: false,
  }

  async ping(): Promise<void> {}

  async getTables(): Promise<string[]> {
    return []
  }

  async getTableSchema<ROW extends ObjectWithId>(table: string): Promise<JsonSchema<ROW>> {
    return {
      ...generateJsonSchemaFromData<ROW>([]),
      $id: `${table}.schema.json`,
    }
  }

  async createTable<ROW extends ObjectWithId>(
    _table: string,
    _schema: JsonSchema<ROW>,
  ): Promise<void> {}

  async getByIds<ROW extends ObjectWithId>(
    _table: string,
    _ids: readonly string[],
  ): Promise<ROW[]> {
    return []
  }

  async saveBatch<ROW extends ObjectWithId>(_table: string, _rows: readonly ROW[]): Promise<void> {}

  async patchById<ROW extends ObjectWithId>(
    _table: string,
    _id: string,
    _patch: Partial<ROW>,
  ): Promise<void> {}

  async incrementBatch(
    _table: string,
    _prop: string,
    _incrementMap: StringMap<number>,
  ): Promise<StringMap<number>> {
    return {}
  }

  async deleteByIds(_table: string, _ids: readonly string[]): Promise<number> {
    return 0
  }

  async multiGet<ROW extends ObjectWithId>(
    idsByTable: StringMap<string[]>,
  ): Promise<StringMap<ROW[]>> {
    const result: StringMap<ROW[]> = {}
    for (const table of Object.keys(idsByTable)) {
      result[table] = []
    }
    return result
  }

  async multiSave<ROW extends ObjectWithId>(_map: StringMap<ROW[]>): Promise<void> {}

  async multiDelete(_map: StringMap<string[]>): Promise<number> {
    return 0
  }

  async runQuery<ROW extends ObjectWithId>(_q: DBQuery<ROW>): Promise<RunQueryResult<ROW>> {
    return { rows: [] }
  }

  async runQueryCount<ROW extends ObjectWithId>(_q: DBQuery<ROW>): Promise<number> {
    return 0
  }

  streamQuery<ROW extends ObjectWithId>(_q: DBQuery<ROW>): Pipeline<ROW> {
    return Pipeline.fromArray([])
  }

  async deleteByQuery<ROW extends ObjectWithId>(_q: DBQuery<ROW>): Promise<number> {
    return 0
  }

  async patchByQuery<ROW extends ObjectWithId>(
    _q: DBQuery<ROW>,
    _patch: Partial<ROW>,
  ): Promise<number> {
    return 0
  }

  async runInTransaction(fn: DBTransactionFn): Promise<void> {
    await fn(new FakeDBTransaction(this))
  }

  async createTransaction(): Promise<DBTransaction> {
    return new FakeDBTransaction(this)
  }
}
