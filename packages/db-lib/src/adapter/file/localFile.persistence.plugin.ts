import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { Pipeline } from '@naturalcycles/nodejs-lib/stream'
import type { DBSaveBatchOperation } from '../../db.model.js'
import type { FileDBPersistencePlugin } from './file.db.model.js'

export interface LocalFilePersistencePluginCfg {
  /**
   * @default ./tmp/localdb
   */
  storagePath: string

  /**
   * @default true
   */
  gzip: boolean
}

/**
 * Persists in local filesystem as ndjson.
 */
export class LocalFilePersistencePlugin implements FileDBPersistencePlugin {
  constructor(cfg: Partial<LocalFilePersistencePluginCfg> = {}) {
    this.cfg = {
      storagePath: './tmp/localdb',
      gzip: true,
      ...cfg,
    }
  }

  cfg!: LocalFilePersistencePluginCfg

  async ping(): Promise<void> {}

  async getTables(): Promise<string[]> {
    return (await fs2.readdirAsync(this.cfg.storagePath))
      .filter(f => f.includes('.ndjson'))
      .map(f => f.split('.ndjson')[0]!)
  }

  async loadFile<ROW extends ObjectWithId>(table: string): Promise<ROW[]> {
    await fs2.ensureDirAsync(this.cfg.storagePath)
    const ext = `ndjson${this.cfg.gzip ? '.gz' : ''}`
    const filePath = `${this.cfg.storagePath}/${table}.${ext}`

    if (!(await fs2.pathExistsAsync(filePath))) return []

    return await Pipeline.fromNDJsonFile<ROW>(filePath).toArray()
  }

  async saveFiles(ops: DBSaveBatchOperation<any>[]): Promise<void> {
    await pMap(ops, async op => await this.saveFile(op.table, op.rows), { concurrency: 32 })
  }

  async saveFile<ROW extends ObjectWithId>(table: string, rows: ROW[]): Promise<void> {
    await fs2.ensureDirAsync(this.cfg.storagePath)
    const ext = `ndjson${this.cfg.gzip ? '.gz' : ''}`
    const filePath = `${this.cfg.storagePath}/${table}.${ext}`

    await Pipeline.fromArray(rows).toNDJsonFile(filePath)
  }
}
