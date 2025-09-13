import { Readable } from 'node:stream'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib/stream'
import type { Database, Statement } from 'sqlite'

/**
 * Based on: https://gist.github.com/rmela/a3bed669ad6194fb2d9670789541b0c7
 */
export class SqliteReadable<T = any> extends Readable implements ReadableTyped<T>, AsyncDisposable {
  private constructor(private stmt: Statement) {
    super({ objectMode: true })

    this.on('end', () => {
      console.log(`SqliteReadable: end`)
      void this.close()
    })
  }

  static async create<T = any>(db: Database, sql: string): Promise<SqliteReadable<T>> {
    const stmt = await db.prepare(sql)
    return new SqliteReadable<T>(stmt)
  }

  private busy = false

  override _read(): void {
    if (this.busy) return

    this.stmt
      .get<T>()
      .then(r => {
        this.push(r || null)
        this.busy = false
      })
      .catch(err => {
        console.error(err)
        this.destroy(err as Error)
      })
  }

  override async [Symbol.asyncDispose](): Promise<void> {
    await this.close()
  }

  /**
   * Necessary to call it, otherwise this error might occur on `db.close()`:
   * SQLITE_BUSY: unable to close due to unfinalized statements or unfinished backups
   */
  async close(): Promise<void> {
    await this.stmt.finalize()
  }
}
