import { expect, it } from 'vitest'
import type { AsyncPredicate } from '../types.js'
import { pDelay } from './pDelay.js'
import { pFilter } from './pFilter.js'

const input = [10, 20, 30]
const filterFn: AsyncPredicate<number> = ms => pDelay(ms).then(() => ms > 15)

it('pFilter', async () => {
  const r = await pFilter(input, filterFn)
  // console.log(r)
  expect(r).toEqual([20, 30])
})
