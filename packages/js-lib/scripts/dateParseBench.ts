/*

pn tsx scripts/dateParseBench.ts

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import dayjs from 'dayjs'
import type { IsoDate } from '../src/index.js'
import { localDate } from '../src/index.js'

const strings = localDate
  .range('2022-01-03' as IsoDate, '2023-01-05' as IsoDate, '[)')
  .map(d => d.toString())
const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/

// dayjs x 4,733 ops/sec ±0.31% (90 runs sampled)
// split x 9,200 ops/sec ±1.73% (88 runs sampled)
// regex x 26,494 ops/sec ±1.33% (90 runs sampled)
runBenchScript({
  fns: {
    dayjs: () => {
      let _y: number
      let _m: number
      let _d: number

      strings.forEach(s => {
        const dd = dayjs(s)

        _y = dd.year()
        _m = dd.month()
        _d = dd.day()
      })
    },
    split: () => {
      let _y: number
      let _m: number
      let _d: number

      strings.forEach(s => {
        const [year, month, day] = s.slice(0, 10).split('-').map(Number)
        _y = year!
        _m = month!
        _d = day!
      })
    },
    regex: () => {
      let _y: number
      let _m: number
      let _d: number

      strings.forEach(s => {
        const matches: string[] | null = DATE.exec(s.slice(0, 10)) as string[]

        _y = Number(matches[1])
        _m = Number(matches[2])
        _d = Number(matches[3])
      })
    },
    localDate: () => {
      let _y: number
      let _m: number
      let _d: number

      strings.forEach(s => {
        const dd = localDate(s)

        _y = dd.year
        _m = dd.month
        _d = dd.day
      })
    },
  },
})
