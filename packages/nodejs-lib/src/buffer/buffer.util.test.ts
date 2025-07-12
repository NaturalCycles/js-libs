import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { _chunkBuffer } from './buffer.util.js'

test('_chunkBuffer', () => {
  const buf = Buffer.from(_range(1, 11))

  // <Buffer 01 02 03 04 05 06 07 08 09 0a>
  // console.log(buf)

  const bufs = _chunkBuffer(buf, 3)
  // console.log(bufs)

  expect(bufs).toStrictEqual([
    Buffer.from([1, 2, 3]),
    Buffer.from([4, 5, 6]),
    Buffer.from([7, 8, 9]),
    Buffer.from([10]),
  ])
})
