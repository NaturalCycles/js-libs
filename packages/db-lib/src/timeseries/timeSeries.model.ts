import type { CommonDB } from '../commondb/common.db.js'

export interface CommonTimeSeriesDaoCfg {
  db: CommonDB
}

/**
 * First number: unix timestamp in milliseconds
 * Second number: value
 * null in the second position means "absense of value" (may exist in _RAW table)
 */
export type TimeSeriesDataPoint = [number, number | null]

export interface TimeSeriesRow {
  id: number
  ts: number
  v: number | null
}

export interface TimeSeriesQuery {
  series: string

  /**
   * Unix timestamp in milliseconds
   */
  fromIncl?: number

  /**
   * Unix timestamp in milliseconds
   */
  toExcl?: number

  minStep?: 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year'
}

/**
 * Used to perform multiple of such ops in a single CommonDB Transaction
 */
export interface TimeSeriesSaveBatchOp {
  series: string
  dataPoints: TimeSeriesDataPoint[]
}
