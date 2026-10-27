import { expect, it, vi } from 'vitest'
import { memoSimple } from './memoSimple.decorator.js'

class A {
  func(n: number): void {
    console.log(`func ${n}`)
  }

  @memoSimple()
  a(a1: number, a2: number): number {
    const n = a1 * a2
    this.func(n)
    return n
  }
}

it('should call the method once per set of arguments', () => {
  const a = new A()
  vi.spyOn(a, 'func').mockImplementation(() => {})

  // first call
  let r = a.a(2, 3)
  expect(r).toBe(6)
  r = a.a(3, 4)
  expect(r).toBe(12)

  // second call
  r = a.a(2, 3)
  expect(r).toBe(6)
  r = a.a(3, 4)
  expect(r).toBe(12)

  // to be called once per set of arguments (2)
  expect(a.func).toMatchSnapshot()

  // cleanup for the next tests
  ;(a.a as any).dropCache()
})

it('should call the method again after dropCache', () => {
  const a = new A()
  vi.spyOn(a, 'func').mockImplementation(() => {})

  // first call
  a.a(2, 3)

  // drop cache
  ;(a.a as any).dropCache()

  // second call
  a.a(2, 3)

  expect(a.func).toHaveBeenCalledTimes(2)
})

it('should throw when applied to a non-method', () => {
  const pd = { value: 'property' } as PropertyDescriptor
  expect(() => memoSimple()(null as any, 'a', pd)).toThrowErrorMatchingInlineSnapshot(
    `[TypeError: Memoization can be applied only to methods]`,
  )
})

class B {
  cacheMisses = 0

  @memoSimple()
  a(a1 = 'def'): void {
    console.log(`a called with a1=${a1}`)
    this.cacheMisses++
  }
}

it('should cache a call with default args apart from one passing the default explicitly', () => {
  const b = new B()

  // Call 1 with default (cache miss). arg1=undefined
  b.a()

  // Call 2 with default (cache hit). arg1=undefined
  b.a()

  // Call 3 with same as default (cache miss). arg1=def
  b.a('def')

  // Call 4 with non-default (cache miss). arg1=nondef
  b.a('nondef')

  expect(b.cacheMisses).toBe(3)
})
