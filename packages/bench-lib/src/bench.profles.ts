import { _randomInt } from '@naturalcycles/js-lib'
import type { BenchFunction } from './bench.model.js'

export const benchNoopFn: BenchFunction = () => {}

export const benchRandomFn: BenchFunction = () => {
  const _ = _randomInt(1, 10)
}
