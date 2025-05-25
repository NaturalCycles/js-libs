/*

DEBUG=* yarn tsn ./src/test/debug.script.ts

 */

import { Debug } from '../log/debug'

const log = Debug('nodejs-lib')

const obj = {
  a: 'a1',
  b: 'b1',
  n: 15,
  d: {
    ooo: null,
  },
}

const err = new Error('Im an error')

console.log('console1', obj)
log('hello log', obj)

log(err)

console.log({ enabled: log.enabled, enabled2: Debug.enabled('nodejs-lib') })
