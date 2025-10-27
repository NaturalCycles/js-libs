import { expect, test, vi } from 'vitest'
import { Array2 } from './array2.js'

test('isArray should be true', () => {
  expect(Array.isArray(Array2.of())).toBe(true)
})

test('stringification', () => {
  const a = Array2.of(1, 2, 3)
  const native = [1, 2, 3]
  expect(a.toString()).toMatchInlineSnapshot(`"1,2,3"`)
  expect(a.toString()).toBe(native.toString())
  expect(JSON.stringify(a)).toBe(JSON.stringify(native))
})

test('firstOrUndefined', () => {
  const arr = Array2.of(1, 2, 3)
  expect(arr.firstOrUndefined()).toBe(1)
  expect(Array2.of().firstOrUndefined()).toBeUndefined()
})

test('first', () => {
  const arr = new Array2('a', 'b')
  expect(arr.first()).toBe('a')
  expect(() => new Array2().first()).toThrow('Array.first called on empty array')
})

test('lastOrUndefined', () => {
  const arr = new Array2(1, 2, 3)
  expect(arr.lastOrUndefined()).toBe(3)
  expect(new Array2().lastOrUndefined()).toBeUndefined()
})

test('last', () => {
  const arr = new Array2('x', 'y', 'z')
  expect(arr.last()).toBe('z')
  expect(() => new Array2().last()).toThrow('Array.last called on empty array')
})

test('uniq', () => {
  const arr = new Array2(1, 2, 2, 3, 1)
  const uniq = arr.uniq()
  expect(uniq).toBeInstanceOf(Array2)
  expect(Array.from(uniq)).toEqual([1, 2, 3])
  expect(uniq).not.toBe(arr)
  expect(Array.from(arr)).toEqual([1, 2, 2, 3, 1])
})

test('shuffle', () => {
  const arr = new Array2(1, 2, 3, 4)
  const sequence = [0.75, 0.5, 0.1]
  const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => sequence.shift() ?? 0)

  const shuffled = arr.shuffle()

  expect(shuffled).toBeInstanceOf(Array2)
  expect(shuffled).not.toBe(arr)
  expect(Array.from(shuffled)).toEqual([3, 1, 2, 4])
  expect(Array.from(arr)).toEqual([1, 2, 3, 4])

  randomSpy.mockRestore()
})

test('isEmpty and isNotEmpty', () => {
  const empty = new Array2()
  const values = new Array2('a')

  expect(empty.isEmpty()).toBe(true)
  expect(empty.isNotEmpty()).toBe(false)

  expect(values.isEmpty()).toBe(false)
  expect(values.isNotEmpty()).toBe(true)
})
