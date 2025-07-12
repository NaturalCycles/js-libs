import { Readable } from 'node:stream'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import { test } from 'vitest'
import { _pipeline } from '../pipeline/pipeline.js'
import { writableVoid } from '../writable/writableVoid.js'
import { transformTap } from './transformTap.js'
import { transformThrottle } from './transformThrottle.js'

test('transformThrottle', async () => {
  await _pipeline([
    // super-fast producer
    Readable.from(_range(1, 11).map(id => ({ id: String(id) }))),
    // transformTap(obj => {
    //   console.log('pre', obj)
    // }),
    transformThrottle<ObjectWithId>({
      interval: 1,
      throughput: 3,
      // debug: true,
    }),
    transformTap(obj => {
      console.log('post', obj)
    }),
    writableVoid(),
  ])
}, 20_000)
