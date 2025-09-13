import { _range } from '@naturalcycles/js-lib/array/range.js'
import { test } from 'vitest'
import { Pipeline } from '../pipeline.js'

test('transformThrottle', async () => {
  // super-fast producer
  await Pipeline.fromArray(_range(1, 11).map(id => ({ id: String(id) })))
    // transformTap(obj => {
    //   console.log('pre', obj)
    // }),
    .throttle({
      interval: 1,
      throughput: 3,
      // debug: true,
    })
    .tapSync(obj => {
      console.log('post', obj)
    })
    .run()
}, 20_000)
