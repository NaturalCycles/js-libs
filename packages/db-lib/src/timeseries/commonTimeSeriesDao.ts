import { _isTruthy } from '@naturalcycles/js-lib'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import { DBQuery } from '../query/dbQuery.js'
import type {
  CommonTimeSeriesDaoCfg,
  TimeSeriesDataPoint,
  TimeSeriesQuery,
  TimeSeriesRow,
  TimeSeriesSaveBatchOp,
} from './timeSeries.model.js'

const _TIMESERIES_RAW = '_TIMESERIES_RAW'

/**
 * TimeSeries DB implementation based on provided CommonDB database.
 * Turns any CommonDB database into TimeSeries DB. Kind of.
 *
 * @experimental
 */
export class CommonTimeSeriesDao {
  constructor(public cfg: CommonTimeSeriesDaoCfg) {}

  async ping(): Promise<void> {
    await this.cfg.db.ping()
  }

  async getSeries(): Promise<string[]> {
    return (await this.cfg.db.getTables())
      .map(t => /^(.*)_TIMESERIES_RAW$/.exec(t)?.[1])
      .filter(_isTruthy)
  }

  // convenience method
  async save(series: string, tsMillis: number, value: number): Promise<void> {
    await this.saveBatch(series, [[tsMillis, value]])
  }

  async saveBatch(series: string, dataPoints: TimeSeriesDataPoint[]): Promise<void> {
    if (!dataPoints.length) return

    const rows: ObjectWithId[] = dataPoints.map(([ts, v]) => ({
      id: String(ts), // Convert Number id into String id, as per CommonDB
      ts, // to allow querying by ts, since querying by id is not always available (Datastore is one example)
      v,
    }))

    await this.cfg.db.saveBatch(`${series}${_TIMESERIES_RAW}`, rows)
  }

  /**
   * All ops are executed as a single CommonDB Transaction.
   */
  async commitTransaction(ops: TimeSeriesSaveBatchOp[]): Promise<void> {
    if (!ops.length) return

    await this.cfg.db.runInTransaction(async tx => {
      for (const op of ops) {
        const rows: ObjectWithId[] = op.dataPoints.map(([ts, v]) => ({
          id: String(ts), // Convert Number id into String id, as per CommonDB
          ts, // to allow querying by ts, since querying by id is not always available (Datastore is one example)
          v,
        }))

        await tx.saveBatch(`${op.series}${_TIMESERIES_RAW}`, rows)
      }
    })
  }

  async deleteById(series: string, tsMillis: number): Promise<void> {
    await this.deleteByIds(series, [tsMillis])
  }

  async deleteByIds(series: string, ids: number[]): Promise<void> {
    // Save to _RAW table with v=null
    await this.saveBatch(
      series,
      ids.map(id => [id, null]),
    )
  }

  async query(q: TimeSeriesQuery): Promise<TimeSeriesDataPoint[]> {
    const dbq = DBQuery.create<any>(`${q.series}${_TIMESERIES_RAW}`).order('ts')
    if (q.fromIncl) dbq.filter('ts', '>=', q.fromIncl)
    if (q.toExcl) dbq.filter('ts', '<', q.toExcl)

    const rows = (await this.cfg.db.runQuery(dbq)).rows as any as TimeSeriesRow[]

    // todo: query from aggregated tables when step is above 'hour'

    return rows
      .filter(r => r.v !== null && r.v !== undefined) // can be 0
      .map(r => [r.ts, r.v])
  }

  async optimize(): Promise<void> {
    // todo
  }
}
