import { expect, it } from 'vitest'
import { _range } from '../array/range.js'
import { _chunkBuffer, _toArrayBuffer } from './buffer.util.js'

it('returns the same ArrayBuffer (zero-copy) when the view covers it fully', () => {
  const u8 = new Uint8Array([1, 2, 3])
  expect(_toArrayBuffer(u8)).toBe(u8.buffer)
})

it('copies exactly the bytes of a view with an offset', () => {
  const u8 = new Uint8Array([1, 2, 3, 4, 5]).subarray(1, 4)
  const ab = _toArrayBuffer(u8)
  expect(ab).not.toBe(u8.buffer)
  expect(ab.byteLength).toBe(3)
  expect(Array.from(new Uint8Array(ab))).toEqual([2, 3, 4])
})

it('copies exactly the bytes of a view that is shorter than its ArrayBuffer', () => {
  const u8 = new Uint8Array([1, 2, 3, 4]).subarray(0, 2)
  expect(Array.from(new Uint8Array(_toArrayBuffer(u8)))).toEqual([1, 2])
})

it('handles a pooled Node.js Buffer', () => {
  // small Buffers are allocated from a shared pool, so .buffer is larger than the Buffer itself
  const buf = Buffer.from('hello')
  expect(buf.buffer.byteLength).toBeGreaterThan(buf.byteLength)
  const ab = _toArrayBuffer(buf)
  expect(ab.byteLength).toBe(5)
  expect(Buffer.from(ab).toString()).toBe('hello')
})

it('works with other typed arrays', () => {
  const f32 = new Float32Array([1.5, 2.5, 3.5]).subarray(1)
  expect(Array.from(new Float32Array(_toArrayBuffer(f32)))).toEqual([2.5, 3.5])
})

it('should split a buffer into chunks of the given size', () => {
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

it('should split a plain Uint8Array into Uint8Array chunks', () => {
  const chunks = _chunkBuffer(new Uint8Array(_range(1, 6)), 2)
  expect(chunks).toStrictEqual([
    new Uint8Array([1, 2]),
    new Uint8Array([3, 4]),
    new Uint8Array([5]),
  ])
  expect(chunks.some(c => Buffer.isBuffer(c))).toBe(false)
})
