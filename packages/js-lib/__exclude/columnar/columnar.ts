import type { AnyObject } from '../types.js'

export class ColumnarParser<T extends AnyObject> {
  constructor (public cfg: ColumnarParserCfg<T>) {
    this.columnsReversed = [...cfg.columns].reverse() as string[]
  }

  private columnsReversed: string[]

  serializeA(rows: T[]): ColumnarRowA[] {
    const { columnsReversed } = this
    const out: ColumnarRowA[] = []

    for (const row of rows) {
      const currentRow: ColumnarRowA = []
      let started = false
      for (const col of columnsReversed) {
        const v = row[col]
        if (started || v !== undefined) {
          currentRow.push(v)
          started = true
        }
      }
      out.push(currentRow.reverse())
    }

    return out
  }

  deserializeA(rows: ColumnarRowA[]): T[] {
    const { columns } = this.cfg
    const columnsLength = columns.length
    const out: T[] = []

    for (const row of rows) {
      const obj = {} as T
      // For monomorphism we populate even undefined/empty columns
      for(let i=0; i < columnsLength; i++) {
        obj[columns[i]!] = row[i] as any
      }
      out.push(obj)
    }

    return out
  }

  serializeB(rows: T[]): ColumnarRowB[] {
    const { columns } = this.cfg
    const columnsLength = columns.length
    const out: ColumnarRowB[] = []

    for (const row of rows) {
      const currentRow: ColumnarRowB = []
      for (let i=0; i < columnsLength; i++) {
        const v = row[columns[i]!]
        if (v !== undefined) {
          currentRow.push([i, v])
        }
      }
      out.push(currentRow)
    }

    return out
  }

  deserializeB(rows: ColumnarRowB[]): T[] {
    const { columns } = this.cfg
    const columnsLength = columns.length
    const out: T[] = []

    for (const row of rows) {
      const valueByTag = {} as any
      for(const tag of row) {
        valueByTag[tag[0]] = tag[1]
      }

      const obj = {} as T
      // For monomorphism we populate even undefined/empty columns
      for(let i=0; i < columnsLength; i++) {
        obj[columns[i]!] = valueByTag[i] as any
      }
      out.push(obj)
    }

    return out
  }
}

export interface ColumnarParserCfg<T extends AnyObject> {
  /**
   * Names of columns.
   * Position in the array represents a column Index.
   */
  columns: (keyof T)[]
}

export type ColumnarDataA = ColumnarRowA[]
export type ColumnarDataB = ColumnarRowB[]

export type ColumnarRowA = unknown[]
export type ColumnarRowB = [index: number, data: unknown][]
