import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import type { CommonDB } from '../commondb/common.db.js'
import type { CommonDBOptions, CommonDBSaveOptions, DBTransaction } from '../db.model.js'

/**
 * Optimizes the Transaction (list of DBOperations) to do less operations.
 * E.g if you save id1 first and then delete it - this function will turn it into a no-op (self-eliminate).
 * UPD: actually, it will only keep delete, but remove previous ops.
 *
 * Currently only takes into account SaveBatch and DeleteByIds ops.
 * Output ops are maximum 1 per entity - save or delete.
 */
// export function mergeDBOperations(ops: DBOperation[]): DBOperation[] {
//   return ops // currently "does nothing"
// }

// Commented out as "overly complicated"
/*
export function mergeDBOperations(ops: DBOperation[]): DBOperation[] {
  if (ops.length <= 1) return ops // nothing to optimize there

  // This map will be saved in the end. Null would mean "delete"
  // saveMap[table][id] => row
  const data: StringMap<StringMap<ObjectWithId | null>> = {}

  // Merge ops using `saveMap`
  ops.forEach(op => {
    data[op.table] ||= {}

    if (op.type === 'saveBatch') {
      op.rows.forEach(r => (data[op.table]![r.id] = r))
    } else if (op.type === 'deleteByIds') {
      op.ids.forEach(id => (data[op.table]![id] = null))
    } else {
      throw new Error(`DBOperation not supported: ${(op as any).type}`)
    }
  })

  const resultOps: DBOperation[] = []

  _stringMapEntries(data).forEach(([table, map]) => {
    const saveOp: DBSaveBatchOperation = {
      type: 'saveBatch',
      table,
      rows: _stringMapValues(map).filter(_isTruthy),
    }

    if (saveOp.rows.length) {
      resultOps.push(saveOp)
    }

    const deleteOp: DBDeleteByIdsOperation = {
      type: 'deleteByIds',
      table,
      ids: _stringMapEntries(map).filter(([id, row]) => row === null).map(([id]) => id),
    }

    if (deleteOp.ids.length) {
      resultOps.push(deleteOp)
    }
  })

  return resultOps
}
 */

/**
 * Naive implementation of "Transaction" which just executes all operations one-by-one.
 * Does NOT actually implement a Transaction, cause partial ops application will happen
 * in case of an error in the middle.
 */
// export async function commitDBTransactionSimple(
//   db: CommonDB,
//   ops: DBOperation[],
//   opt?: CommonDBSaveOptions,
// ): Promise<void> {
//   // const ops = mergeDBOperations(tx.ops)
//
//   for await (const op of ops) {
//     if (op.type === 'saveBatch') {
//       await db.saveBatch(op.table, op.rows, { ...op.opt, ...opt })
//     } else if (op.type === 'deleteByIds') {
//       await db.deleteByQuery(DBQuery.create(op.table).filter('id', 'in', op.ids), {
//         ...op.opt,
//         ...opt,
//       })
//     } else {
//       throw new Error(`DBOperation not supported: ${(op as any).type}`)
//     }
//   }
// }

/**
 * Fake implementation of DBTransactionContext,
 * which executes all operations instantly, without any Transaction involved.
 */
export class FakeDBTransaction implements DBTransaction {
  constructor(protected db: CommonDB) {}

  // no-op
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}

  async getByIds<ROW extends ObjectWithId>(
    table: string,
    ids: string[],
    opt?: CommonDBOptions,
  ): Promise<ROW[]> {
    return await this.db.getByIds(table, ids, opt)
  }

  // async runQuery<ROW extends ObjectWithId>(
  //   q: DBQuery<ROW>,
  //   opt?: CommonDBOptions,
  // ): Promise<RunQueryResult<ROW>> {
  //   return await this.db.runQuery(q, opt)
  // }
  async saveBatch<ROW extends ObjectWithId>(
    table: string,
    rows: ROW[],
    opt?: CommonDBSaveOptions<ROW>,
  ): Promise<void> {
    await this.db.saveBatch(table, rows, opt)
  }

  async deleteByIds(table: string, ids: string[], opt?: CommonDBOptions): Promise<number> {
    return await this.db.deleteByIds(table, ids, opt)
  }
}
