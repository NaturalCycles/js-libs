/*

yarn tsx scripts/startsWith

 */

import { _range } from '@naturalcycles/js-lib'
import { runBenchScript } from '../src/index.js'

const strings = _range(100).map(String)

/* eslint-disable */

runBenchScript({
  fns: {
    startsWith: () => {
      let _count = 0
      strings.forEach(s => {
        if (s.startsWith('2')) _count++
      })
    },
    indexOf: () => {
      let _count = 0
      strings.forEach(s => {
        if (s.indexOf('2') === 0) _count++
      })
    },
  },
})
