/*

pn tsx scripts/dateStringTodayBench

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import type { IsoDate } from '@naturalcycles/js-lib'
import { localDate } from '@naturalcycles/js-lib'
import { isValid, objectSchema, stringSchema } from '../src/validation/joi/index.js'

const entries = localDate
  .range(localDate.today().minus(50, 'day'), localDate.today().plus(50, 'day'), '[)')
  .map(d => ({
    date: d.toISODate(),
  }))

const entrySchema1 = objectSchema({
  date: stringSchema.dateString('2000-01-01' as IsoDate, 'today'),
})

const entrySchema2 = objectSchema({
  date: (stringSchema as any).dateString2('2000-01-01', 'today'),
})

runBenchScript({
  fns: {
    fn1: () => {
      const _r = entries.map(e => {
        return isValid(e, entrySchema1)
      })
    },
    fn2: () => {
      const _r = entries.map(e => {
        return isValid(e, entrySchema2)
      })
    },
  },
})
