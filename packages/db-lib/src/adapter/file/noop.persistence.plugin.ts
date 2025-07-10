import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import type { DBSaveBatchOperation } from '../../db.model.js'
import type { FileDBPersistencePlugin } from './file.db.model.js'

export class NoopPersistencePlugin implements FileDBPersistencePlugin {
  async ping(): Promise<void> {}

  async getTables(): Promise<string[]> {
    return []
  }

  async loadFile<ROW extends ObjectWithId>(_table: string): Promise<ROW[]> {
    return []
  }

  async saveFiles(_ops: DBSaveBatchOperation<any>[]): Promise<void> {}
}
