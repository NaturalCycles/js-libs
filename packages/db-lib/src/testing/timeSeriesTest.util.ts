import { _randomInt } from '@naturalcycles/js-lib'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { nowUnixMillis } from '@naturalcycles/js-lib/datetime/localTime.js'
import type { TimeSeriesDataPoint } from '../timeseries/timeSeries.model.js'

export function createTestTimeSeries(count = 10): TimeSeriesDataPoint[] {
  const ts = nowUnixMillis()
  return _range(1, count + 1).map(i => [ts - i * 60_000, _randomInt(10, 20)])
}
