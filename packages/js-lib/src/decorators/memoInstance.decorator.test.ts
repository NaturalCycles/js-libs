import { expect, test, vi } from 'vitest'
import { _range } from '../index.js'
import { _Memo } from './memo.decorator.js'

class C {
  fn(): void {}

  @_Memo()
  method(n: number): number {
    this.fn()
    return n * 2
  }
}

const c1 = new C()
const c2 = new C()

test('memoInstance should cache per instance', () => {
  let fn1Calls = 0
  let fn2Calls = 0
  const fn1 = vi.spyOn(c1, 'fn')
  const fn2 = vi.spyOn(c2, 'fn')

  c1.method(1) // miss
  expect(fn1).toHaveBeenCalledTimes(++fn1Calls)

  c1.method(1) // hit
  expect(fn1).toHaveBeenCalledTimes(fn1Calls)

  c1.method(1) // hit
  expect(fn1).toHaveBeenCalledTimes(fn1Calls)

  c1.method(2) // miss
  expect(fn1).toHaveBeenCalledTimes(++fn1Calls)

  c1.method(2) // hit
  expect(fn1).toHaveBeenCalledTimes(fn1Calls)

  c2.method(1) // miss
  expect(fn2).toHaveBeenCalledTimes(++fn2Calls)

  c2.method(1) // hit
  expect(fn2).toHaveBeenCalledTimes(fn2Calls)

  c2.method(2) // miss
  expect(fn2).toHaveBeenCalledTimes(++fn2Calls)

  c2.method(2) // hit
  expect(fn2).toHaveBeenCalledTimes(fn2Calls)
})

// Intended to fail if memoInstance is not using WeakMap (not normal Map)
test('leak test', () => {
  _range(0, 100).forEach(() => {
    const c = new C()
    _range(1, 10).forEach(n => c.method(n))
  })
})
