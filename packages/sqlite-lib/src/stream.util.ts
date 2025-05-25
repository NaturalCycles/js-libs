import { Readable } from 'node:stream'
import type { ReadableTyped } from '@naturalcycles/nodejs-lib'
import type { Database, Statement } from 'sqlite'

/**
 * Based on: https://gist.github.com/rmela/a3bed669ad6194fb2d9670789541b0c7
 */
export class SqliteReadable<T = any> extends Readable implements ReadableTyped<T> {
  constructor(private stmt: Statement) {
    super({ objectMode: true })

    // might be unnecessary
    // this.on( 'end', () => {
    //   console.log(`SQLiteStream end`)
    //   void this.stmt.finalize()
    // })
  }

  static async create<T = any>(db: Database, sql: string): Promise<SqliteReadable<T>> {
    const stmt = await db.prepare(sql)
    return new SqliteReadable<T>(stmt)
  }

  /**
   * Necessary to call it, otherwise this error might occur on `db.close()`:
   * SQLITE_BUSY: unable to close due to unfinalized statements or unfinished backups
   */
  async close(): Promise<void> {
    await this.stmt.finalize()
  }

  // count = 0 // use for debugging

  override async _read(): Promise<void> {
    // console.log(`read ${++this.count}`) // debugging
    try {
      const r = await this.stmt.get<T>()
      this.push(r || null)
    } catch (err) {
      console.log(err)
      this.emit('error', err)
    }
  }
}
