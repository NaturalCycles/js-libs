// Inspired by: https://github.com/ryu1kn/csv-writer/

import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import type { AnyObject } from '@naturalcycles/js-lib/types'

export interface CSVWriterConfig {
  /**
   * Default: comma
   */
  delimiter?: string

  /**
   * Array of columns
   */
  columns?: string[]

  /**
   * Default: true
   */
  includeHeader?: boolean
}

export class CSVWriter {
  constructor(cfg: CSVWriterConfig) {
    this.cfg = {
      delimiter: ',',
      includeHeader: true,
      ...cfg,
    }
  }

  cfg: CSVWriterConfig & { delimiter: string }

  writeRows(rows: AnyObject[]): string {
    let s = ''

    // Detect columns based on content, if not defined upfront
    this.cfg.columns ||= arrayToCSVColumns(rows)

    if (this.cfg.includeHeader && rows.length) {
      s += this.writeHeader() + '\n'
    }
    return s + rows.map(row => this.writeRow(row)).join('\n')
  }

  writeHeader(): string {
    _assert(this.cfg.columns, 'CSVWriter cannot writeHeader, because columns were not provided')
    return this.cfg.columns.map(col => this.quoteIfNeeded(col)).join(this.cfg.delimiter)
  }

  writeRow(row: AnyObject): string {
    _assert(this.cfg.columns, 'CSVWriter cannot writeRow, because columns were not provided')
    return this.cfg.columns
      .map(col => this.quoteIfNeeded(String(row[col] ?? '')))
      .join(this.cfg.delimiter)
  }

  private quoteIfNeeded(s: string): string {
    return this.shouldQuote(s) ? this.quote(s) : s
  }

  private quote(s: string): string {
    return `"${s.replaceAll('"', '""')}"`
  }

  private shouldQuote(s: string): boolean {
    return s.includes(this.cfg.delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')
  }
}

export function arrayToCSVString(arr: AnyObject[], cfg: CSVWriterConfig = {}): string {
  const writer = new CSVWriter(cfg)
  return writer.writeRows(arr)
}

/**
 * Iterates over the whole array and notes all possible columns.
 */
export function arrayToCSVColumns(arr: AnyObject[]): string[] {
  const cols = new Set<string>()
  arr.forEach(row => Object.keys(row).forEach(col => cols.add(col)))
  return [...cols]
}
