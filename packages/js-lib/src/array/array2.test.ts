import { expect, it, vi } from 'vitest'
import { Array2 } from './array2.js'

it('should be recognized by Array.isArray', () => {
  expect(Array.isArray(Array2.of())).toBe(true)
})

it('should stringify and serialize to JSON like a native array', () => {
  const a = Array2.of(1, 2, 3)
  const native = [1, 2, 3]
  expect(a.toString()).toMatchInlineSnapshot(`"1,2,3"`)
  expect(a.toString()).toBe(native.toString())
  expect(JSON.stringify(a)).toBe(JSON.stringify(native))
})

it('should return the first item or undefined from firstOrUndefined', () => {
  const arr = Array2.of(1, 2, 3)
  expect(arr.firstOrUndefined()).toBe(1)
  expect(Array2.of().firstOrUndefined()).toBeUndefined()
})

it('should return the first item from first, throwing when empty', () => {
  const arr = new Array2('a', 'b')
  expect(arr.first()).toBe('a')
  expect(() => new Array2().first()).toThrow('Array.first called on empty array')
})

it('should return the last item or undefined from lastOrUndefined', () => {
  const arr = new Array2(1, 2, 3)
  expect(arr.lastOrUndefined()).toBe(3)
  expect(new Array2().lastOrUndefined()).toBeUndefined()
})

it('should return the last item from last, throwing when empty', () => {
  const arr = new Array2('x', 'y', 'z')
  expect(arr.last()).toBe('z')
  expect(() => new Array2().last()).toThrow('Array.last called on empty array')
})

it('should return a new Array2 without duplicates from uniq', () => {
  const arr = new Array2(1, 2, 2, 3, 1)
  const uniq = arr.uniq()
  expect(uniq).toBeInstanceOf(Array2)
  expect(Array.from(uniq)).toEqual([1, 2, 3])
  expect(uniq).not.toBe(arr)
  expect(Array.from(arr)).toEqual([1, 2, 2, 3, 1])
})

it('should return a shuffled new Array2 from shuffle, leaving the original intact', () => {
  const arr = new Array2(1, 2, 3, 4)
  const sequence = [0.75, 0.5, 0.1]
  // oxlint-disable-next-line vitest/prefer-mock-return-shorthand
  const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => sequence.shift() ?? 0)

  const shuffled = arr.shuffle()

  expect(shuffled).toBeInstanceOf(Array2)
  expect(shuffled).not.toBe(arr)
  expect(Array.from(shuffled)).toEqual([3, 1, 2, 4])
  expect(Array.from(arr)).toEqual([1, 2, 3, 4])

  randomSpy.mockRestore()
})

it('should report emptiness with isEmpty and isNotEmpty', () => {
  const empty = new Array2()
  const values = new Array2('a')

  expect(empty.isEmpty()).toBe(true)
  expect(empty.isNotEmpty()).toBe(false)

  expect(values.isEmpty()).toBe(false)
  expect(values.isNotEmpty()).toBe(true)
})
