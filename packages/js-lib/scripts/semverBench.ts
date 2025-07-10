/*

pn tsx scripts/semverBench

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import semver from 'semver'
import { _range } from '../src/index.js'
import { semver2 } from '../src/semver.js'

const data = _range(10).map(n => `${n}.${(n * 7) % 10}.${(n * 9) % 7}`)
const data2 = _range(data.length).map(n => `${n}.${Math.round((n * 7.5) % 10)}.${(n * 5) % 7}`)
// console.log(data)

runBenchScript({
  fns: {
    _semver: () => {
      const _a: any[] = []

      _range(data.length).forEach(i => {
        _a.push(semver2(data[i]!).compare(data2[i]!))
      })
    },
    semver: () => {
      const _a: any[] = []

      _range(data.length).forEach(i => {
        _a.push(semver.parse(data[i])!.compare(data2[i]!))
      })
    },
  },
})
