import { _by } from '@naturalcycles/js-lib/array/array.util.js'
import type { ObjectWithId, StringMap } from '@naturalcycles/js-lib/types'
import type { DBSaveBatchOperation } from '../../db.model.js'
import type { FileDBPersistencePlugin } from './file.db.model.js'

/**
 * Mostly useful for testing.
 */
export class InMemoryPersistencePlugin implements FileDBPersistencePlugin {
  data: StringMap<StringMap<ObjectWithId>> = {}

  async ping(): Promise<void> {}

  async getTables(): Promise<string[]> {
    return Object.keys(this.data)
  }

  async loadFile<ROW extends ObjectWithId>(table: string): Promise<ROW[]> {
    return Object.values(this.data[table] || ({} as any))
  }

  async saveFiles(ops: DBSaveBatchOperation<any>[]): Promise<void> {
    ops.forEach(op => {
      this.data[op.table] = _by(op.rows, r => r.id)
    })
  }
}
