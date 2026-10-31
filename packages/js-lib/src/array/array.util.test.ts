import { expect, expectTypeOf, it, vi } from 'vitest'
import { _createDeterministicRandom } from '../number/createDeterministicRandom.js'
import type { AbortablePredicate, Mapper, NonEmptyArray, StringMap } from '../types.js'
import { END } from '../types.js'
import {
  _arrayPushOrRemove,
  _arrayRemove,
  _by,
  _chunk,
  _count,
  _countAtLeast,
  _countBy,
  _countLessThan,
  _difference,
  _dropRightWhile,
  _dropWhile,
  _find,
  _findLast,
  _first,
  _firstFromIterable,
  _firstLast,
  _firstLastOrUndefined,
  _firstOrUndefined,
  _firstOrUndefinedFromIterable,
  _groupBy,
  _intersection,
  _intersectsWith,
  _isNonEmptyArray,
  _last,
  _lastOrUndefined,
  _mapBy,
  _mapToObject,
  _max,
  _maxBy,
  _maxByOrUndefined,
  _maxOrUndefined,
  _min,
  _minBy,
  _minByOrUndefined,
  _minMax,
  _minMaxBy,
  _minMaxByOrUndefined,
  _minMaxOrUndefined,
  _minOrUndefined,
  _pushUniq,
  _pushUniqBy,
  _shuffle,
  _sum,
  _sumBy,
  _takeRightWhile,
  _takeWhile,
  _uniq,
  _uniqBy,
  _zip,
} from './array.util.js'
import { _range } from './range.js'

it('should split an array into chunks of the given size, defaulting to 1', () => {
  const a = [1, 2, 3, 4, 5, 6]

  expect(_chunk(a)).toEqual([[1], [2], [3], [4], [5], [6]])

  expect(_chunk(a, 2)).toEqual([
    [1, 2],
    [3, 4],
    [5, 6],
  ])

  const b = [1, 2, 3]
  expect(_chunk(b, 2)).toEqual([[1, 2], [3]])

  expect(_chunk([])).toEqual([])
  expectTypeOf(_chunk(a)).toEqualTypeOf<NonEmptyArray<number>[]>()
})

it('should remove duplicates, keeping the first occurrence order', () => {
  const a = [1, 2, 2, 1, 3, 5, 3, 4]
  expect(_uniq(a)).toEqual([1, 2, 3, 5, 4])
})

it('should push only the items not present yet, mutating the array in place', () => {
  const a = [1, 2]
  expect(_pushUniq(a)).toEqual([1, 2])
  expect(_pushUniq(a)).toBe(a) // same reference
  expect(_pushUniq(a, 1)).toEqual([1, 2])
  expect(_pushUniq(a, 2)).toEqual([1, 2])
  expect(_pushUniq(a, 3)).toEqual([1, 2, 3])
  expect(_pushUniq(a, 3)).toBe(a) // same reference
  expect(_pushUniq(a, 3, 2, 1)).toEqual([1, 2, 3])
  expect(_pushUniq(a, 3, 2, 1, 5)).toEqual([1, 2, 3, 5])
})

it('should remove items whose mapped key is a duplicate', () => {
  const a = [1, 2, 2, 1, 3, 5, 3, 4]
  expect(_uniqBy(a, a => a)).toEqual([1, 2, 3, 5, 4])

  expect(_uniqBy([2.1, 1.2, 2.3], Math.floor)).toEqual([2.1, 1.2])

  expect(_uniqBy([{ x: 1 }, { x: 2 }, { x: 1 }], r => r.x)).toEqual([{ x: 1 }, { x: 2 }])
})

it('should push only the items whose mapped key is not present yet', () => {
  const a = [1, 2]
  const floorMapper: Mapper<number, number> = n => Math.floor(n)
  expect(_pushUniqBy(a, floorMapper)).toEqual([1, 2])
  expect(_pushUniqBy(a, floorMapper)).toBe(a)
  expect(_pushUniqBy(a, floorMapper, 1.1, 1.2, 1.5, 1.9, 2, 2.3, 3.1, 3.2)).toEqual([1, 2, 3.1])
})

it('should index items by the mapped key into an object, skipping undefined keys', () => {
  // expect(_by(undefined, (r: any) => r.a)).toEqual({})

  const a = [{ a: 'aa' }, { a: 'ab' }, { b: 'bb' }]
  let r = _by(a, r => r.a)
  expect(r).toEqual({
    aa: { a: 'aa' },
    ab: { a: 'ab' },
  })

  r = _by(a, v => v.a?.toUpperCase())
  expect(r).toEqual({
    AA: { a: 'aa' },
    AB: { a: 'ab' },
  })
})

it('should index items by the mapped key into a Map, skipping undefined keys', () => {
  const a = [{ a: 'aa' }, { a: 'ab' }, { b: 'bb' }]
  expect(_mapBy(a, r => r.a)).toMatchInlineSnapshot(`
    Map {
      "aa" => {
        "a": "aa",
      },
      "ab" => {
        "a": "ab",
      },
    }
  `)

  expect(_mapBy(a, r => r.a?.toUpperCase())).toMatchInlineSnapshot(`
    Map {
      "AA" => {
        "a": "aa",
      },
      "AB" => {
        "a": "ab",
      },
    }
  `)
})

it('should group items by the mapped key', () => {
  expect(_groupBy(_range(5), n => (n % 2 ? 'odd' : 'even'))).toEqual({
    even: [0, 2, 4],
    odd: [1, 3],
  })
  expectTypeOf(_groupBy(_range(5), n => n)).toEqualTypeOf<StringMap<NonEmptyArray<number>>>()
})

it('should return the first matching item, or undefined when the predicate returns END', () => {
  expect(_find([1, 2, 3, 4], n => n % 2 === 0)).toBe(2)
  expect(_find([1, 2, 3, 4], n => (n === 2 ? END : false))).toBeUndefined()
})

it('should return the last matching item, or undefined when the predicate returns END', () => {
  expect(_findLast([1, 2, 3, 4], n => n % 2 === 1)).toBe(3)
  expect(_findLast([1, 2, 3, 4], n => (n === 2 ? END : false))).toBeUndefined()
})

it('should take items from the start while the predicate holds', () => {
  expect(_takeWhile([1, 2, 3, 4, 5, 2, 1], v => v <= 3)).toEqual([1, 2, 3])
  expect(_takeWhile([1, 2, 3, 4, 5, 2, 1], v => v > 5)).toEqual([])
})

it('should take items from the end while the predicate holds, last item first', () => {
  expect(_takeRightWhile([1, 2, 3, 4, 5, 2, 1], v => v <= 3)).toEqual([1, 2])
  expect(_takeRightWhile([1, 2, 3, 4, 5, 2, 1], v => v > 5)).toEqual([])
})

it('should drop items from the start while the predicate holds', () => {
  expect(_dropWhile([1, 2, 3, 4, 5, 2, 1], v => v <= 3)).toEqual([4, 5, 2, 1])
  expect(_dropWhile([1, 2, 3, 4, 5, 2, 1], v => v > 5)).toEqual([1, 2, 3, 4, 5, 2, 1])
  expect(_dropWhile([1, 2, 3, 4, 5, 2, 1], v => v < 10)).toEqual([])
})

it('should drop items from the end while the predicate holds', () => {
  expect(_dropRightWhile([1, 2, 3, 4, 5, 2, 1], v => v <= 3)).toEqual([1, 2, 3, 4, 5])
  expect(_dropRightWhile([1, 2, 3, 4, 5, 2, 1], v => v > 5)).toEqual([1, 2, 3, 4, 5, 2, 1])
  expect(_dropRightWhile([1, 2, 3, 4, 5, 2, 1], v => v < 10)).toEqual([])
})

it('should count matches up to a limit with _count, _countAtLeast and _countLessThan', () => {
  const a = [1, 2, 3, 4, 5]
  const isEven: AbortablePredicate<number> = n => n % 2 === 0

  expect(_count(a, isEven)).toBe(2)
  expect(_countAtLeast(a, isEven, 0)).toBe(true)
  expect(_countAtLeast(a, isEven, 1)).toBe(true)
  expect(_countAtLeast(a, isEven, 2)).toBe(true)
  expect(_countAtLeast(a, isEven, 3)).toBe(false)
  expect(_countAtLeast(a, isEven, 4)).toBe(false)

  expect(_countLessThan(a, isEven, 0)).toBe(false)
  expect(_countLessThan(a, isEven, 1)).toBe(false)
  expect(_countLessThan(a, isEven, 2)).toBe(false)
  expect(_countLessThan(a, isEven, 3)).toBe(true)
  expect(_countLessThan(a, isEven, 4)).toBe(true)

  // with limit
  expect(_count(a, isEven, 0)).toBe(0)
  expect(_count(a, isEven, 1)).toBe(1)
  expect(_count(a, isEven, 2)).toBe(2)
  expect(_count(a, isEven, 3)).toBe(2)
  expect(_count(a, isEven, 55)).toBe(2)

  // should support passing a readonly array
  const b: readonly number[] = [1, 2, 3]
  expect(_count(b, isEven)).toBe(1)

  const c = [1, 2, 3] as Iterable<number>
  expect(_count(c, isEven)).toBe(1)
})

it('should count items per mapped key', () => {
  expect(_countBy(['a', 'aa', 'aaa', 'aaa', 'aaaa'], r => r.length)).toEqual({
    1: 1,
    2: 1,
    3: 2,
    4: 1,
  })

  expect(_countBy([1, 2, 3, 4, 5], n => (n % 2 === 0 ? 'even' : 'odd'))).toEqual({
    even: 2,
    odd: 3,
  })
})

it('should return the items of the first array that are in the second array or Set', () => {
  const f = _intersection
  // expect(f()).toEqual([])
  // expect(f([1])).toEqual([1])
  expect(f([], [1])).toEqual([])
  expect(f([1], [])).toEqual([])
  expect(f([1], [1])).toEqual([1])
  expect(f([1], [1, 2])).toEqual([1])
  expect(f([1], [2])).toEqual([])
  expect(f([2, 1], [2, 3])).toEqual([2])

  // expect(f([1], [1], [1])).toEqual([1])
  // expect(f([1], [1], [])).toEqual([])
  // expect(f([1], [1, 2], [])).toEqual([])
  // expect(f([1, 2], [1, 2, 3], [1, 2, 3, 4])).toEqual([1, 2])

  expect(f([], new Set([1]))).toEqual([])
  expect(f([1], new Set())).toEqual([])
  expect(f([1], new Set([1]))).toEqual([1])
  expect(f([1], new Set([1, 2]))).toEqual([1])
  expect(f([1], new Set([2]))).toEqual([])
  expect(f([2, 1], new Set([2, 3]))).toEqual([2])
})

it('should tell whether an array shares an item with another array or Set', () => {
  const f = _intersectsWith

  expect(f([], [1])).toBe(false)
  expect(f([1], [])).toBe(false)
  expect(f([1], [1])).toBe(true)
  expect(f([1], [1, 2])).toBe(true)
  expect(f([1], [2])).toBe(false)
  expect(f([2, 1], [2, 3])).toBe(true)

  expect(f([], new Set([1]))).toBe(false)
  expect(f([2, 1], new Set([2, 3]))).toBe(true)
})

it('should return the items of the first array that are not in the second', () => {
  const f = _difference
  expect(f([1], [1])).toEqual([])
  expect(f([1], [1, 2])).toEqual([])
  expect(f([1, 2], [2])).toEqual([1])
  expect(f([2, 1], [2, 3])).toEqual([1])
  expect(f([2, 1], [3])).toEqual([2, 1])
  expect(f([2, 4, 1], [2, 3])).toEqual([4, 1])
})

it('should return a new array without any occurrence of the item', () => {
  // Basic removal
  expect(_arrayRemove([1, 2, 3], 2)).toEqual([1, 3])
  expect(_arrayRemove([1, 2, 3], 1)).toEqual([2, 3])
  expect(_arrayRemove([1, 2, 3], 3)).toEqual([1, 2])

  // Does not mutate the original array
  const a = [1, 2, 3]
  const result = _arrayRemove(a, 2)
  expect(a).toEqual([1, 2, 3])
  expect(result).not.toBe(a)

  // Removes all occurrences
  expect(_arrayRemove([1, 2, 2, 3, 2], 2)).toEqual([1, 3])

  // Item not present
  expect(_arrayRemove([1, 2, 3], 4)).toEqual([1, 2, 3])

  // Empty array
  expect(_arrayRemove([], 1)).toEqual([])

  // Works with strings
  expect(_arrayRemove(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])

  // Works with objects (by reference)
  const obj = { id: 1 }
  expect(_arrayRemove([obj, { id: 2 }], obj)).toEqual([{ id: 2 }])
})

it('should push a missing item in place when true, or return a copy without it when false', () => {
  // predicate=true: pushes item if not present
  const a = [1, 2, 3]
  const result = _arrayPushOrRemove(a, 4, true)
  expect(result).toEqual([1, 2, 3, 4])
  expect(result).toBe(a) // mutates the array

  // predicate=true: does not add duplicate
  const b = [1, 2, 3]
  const result2 = _arrayPushOrRemove(b, 2, true)
  expect(result2).toEqual([1, 2, 3])
  expect(result2).toBe(b) // same reference

  // predicate=false: removes item
  const c = [1, 2, 3]
  const result3 = _arrayPushOrRemove(c, 2, false)
  expect(result3).toEqual([1, 3])
  expect(result3).not.toBe(c) // returns new array

  // predicate=false: removes all occurrences
  expect(_arrayPushOrRemove([1, 2, 2, 3], 2, false)).toEqual([1, 3])

  // predicate=false: item not present
  const d = [1, 2, 3]
  expect(_arrayPushOrRemove(d, 4, false)).toEqual([1, 2, 3])

  // Empty array with predicate=true
  const e: number[] = []
  expect(_arrayPushOrRemove(e, 1, true)).toEqual([1])
  expect(e).toEqual([1]) // mutated

  // Empty array with predicate=false
  expect(_arrayPushOrRemove([], 1, false)).toEqual([])
})

it('should map items to key-value pairs, skipping falsy mapper results', () => {
  expect(_mapToObject(_range(3), i => [i, i * 2])).toEqual({
    0: 0,
    1: 2,
    2: 4,
  })

  expect(_mapToObject(_range(3), i => [i, `id${i}`])).toEqual({
    0: 'id0',
    1: 'id1',
    2: 'id2',
  })

  // Filtering
  expect(_mapToObject(_range(5), i => i % 2 && [i, i])).toEqual({
    1: 1,
    3: 3,
  })
})

it('should shuffle into a new array by default, or in place with mutate', () => {
  const a = [1, 2, 3, 4, 5]
  Object.freeze(a) // should not be mutated

  const deterministicRandom = _createDeterministicRandom()
  // oxlint-disable-next-line vitest/prefer-mock-return-shorthand
  vi.spyOn(Math, 'random').mockImplementation(() => deterministicRandom())

  const b = _shuffle(a)
  expect(b).toMatchInlineSnapshot(`
    [
      1,
      3,
      4,
      2,
      5,
    ]
  `)

  _shuffle(b, { mutate: true })
  // should be mutated
  expect(b).toMatchInlineSnapshot(`
    [
      2,
      3,
      4,
      1,
      5,
    ]
  `)
})

it.each([
  [[], 0],
  [[2], 2],
  [[-1, 4], 3],
])('should sum %s to %s', (items: number[], result: number) => {
  expect(_sum(items)).toBe(result)
})

it('should sum the mapped values, skipping undefined', () => {
  const items = [
    { a: 1 },
    { a: 2 },
    { b: 3 }, // a is undefined
  ]

  expect(_sumBy(items, i => i.a)).toBe(3)
})

it('should return the last item, with _last throwing on an empty array', () => {
  expect(_lastOrUndefined([])).toBeUndefined()
  expect(_lastOrUndefined([undefined])).toBeUndefined()
  expect(_lastOrUndefined([1, undefined])).toBeUndefined()
  expect(_lastOrUndefined([1, 2])).toBe(2)
  expect(_lastOrUndefined([1])).toBe(1)

  expect(() => _last([])).toThrowErrorMatchingInlineSnapshot(`[Error: _last called on empty array]`)
  expect(_last([undefined])).toBeUndefined()
  expect(_last([1, undefined])).toBeUndefined()
  expect(_last([1, 2])).toBe(2)
  expect(_last([1])).toBe(1)

  // Should support passing readonly array
  const ro = [1, 2, 3] as readonly number[]
  expect(_last(ro)).toBe(3)
})

it('should return the first and last items, with _firstLast throwing on an empty array', () => {
  expect(() => _firstLast([])).toThrowErrorMatchingInlineSnapshot(
    `[Error: _firstLast called on empty array]`,
  )
  expect(_firstLast([1])).toEqual([1, 1])
  expect(_firstLast([1, 2])).toEqual([1, 2])
  expect(_firstLast([1, 2, 3])).toEqual([1, 3])

  expect(_firstLastOrUndefined([])).toBeUndefined()
  expect(_firstLastOrUndefined([1])).toEqual([1, 1])
  expect(_firstLastOrUndefined([1, 2])).toEqual([1, 2])
  expect(_firstLastOrUndefined([1, 2, 3])).toEqual([1, 3])
})

it('should return the first item, with _first throwing on an empty array', () => {
  expect(_firstOrUndefined([])).toBeUndefined()
  expect(_firstOrUndefined([undefined])).toBeUndefined()
  expect(_firstOrUndefined([undefined, 1])).toBeUndefined()
  expect(_firstOrUndefined([1, 2])).toBe(1)
  expect(_firstOrUndefined([1])).toBe(1)

  expect(() => _first([])).toThrowErrorMatchingInlineSnapshot(
    `[Error: _first called on empty array]`,
  )
  expect(_first([undefined])).toBeUndefined()
  expect(_first([1, undefined])).toBe(1)
  expect(_first([1, 2])).toBe(1)
  expect(_first([1])).toBe(1)
})

it('should narrow to NonEmptyArray with _isNonEmptyArray', () => {
  expect(_isNonEmptyArray([])).toBe(false)
  expect(_isNonEmptyArray([undefined])).toBe(true)
  expect(_isNonEmptyArray([1, 2])).toBe(true)

  const arr: number[] = [1, 2]
  expectTypeOf(arr[0]).toEqualTypeOf<number | undefined>()
  if (_isNonEmptyArray(arr)) {
    expectTypeOf(arr).toEqualTypeOf<NonEmptyArray<number>>()
    expectTypeOf(arr[0]).toEqualTypeOf<number>()
    // Still usable where a regular array is expected
    const plain: number[] = arr
    expect(plain).toBe(arr)
  }

  const readonlyArr: readonly number[] = [1, 2]
  if (_isNonEmptyArray(readonlyArr)) {
    expectTypeOf(readonlyArr).toEqualTypeOf<readonly [number, ...number[]]>()
    expectTypeOf(readonlyArr[0]).toEqualTypeOf<number>()
    // @ts-expect-error readonly stays readonly
    readonlyArr.push(3)
  }

  // Literals are assignable directly, empty literal is not
  const ok: NonEmptyArray<number> = [1]
  expect(ok).toEqual([1])
  // @ts-expect-error empty array is not a NonEmptyArray
  const __bad: NonEmptyArray<number> = []
})

it('should return the first item of any iterable, with _firstFromIterable throwing when empty', () => {
  expect(_firstOrUndefinedFromIterable([])).toBeUndefined()
  expect(_firstOrUndefinedFromIterable([1, 2, 3])).toBe(1)
  expect(_firstOrUndefinedFromIterable(new Set([1, 2, 3]))).toBe(1)
  expect(_firstOrUndefinedFromIterable(new Set<number>())).toBeUndefined()
  expect(_firstOrUndefinedFromIterable(new Map([['a', 1]]).values())).toBe(1)
  expect(
    _firstOrUndefinedFromIterable(
      new Map([
        ['a', 1],
        ['b', 2],
      ]).keys(),
    ),
  ).toBe('a')

  function* gen(): Generator<string> {
    yield 'x'
    yield 'y'
  }

  expect(_firstOrUndefinedFromIterable(gen())).toBe('x')

  function* emptyGen(): Generator<string> {}

  expect(_firstOrUndefinedFromIterable(emptyGen())).toBeUndefined()

  // throwing variant
  expect(() => _firstFromIterable([])).toThrowErrorMatchingInlineSnapshot(
    `[Error: _firstFromIterable called on empty iterable]`,
  )
  expect(() => _firstFromIterable(new Set<number>())).toThrowErrorMatchingInlineSnapshot(
    `[Error: _firstFromIterable called on empty iterable]`,
  )
  expect(_firstFromIterable([1, 2, 3])).toBe(1)
  expect(_firstFromIterable(new Set(['a']))).toBe('a')
})

it('should return the smallest value ignoring undefined, with _min throwing on an empty array', () => {
  expect(_minOrUndefined([])).toBeUndefined()
  expect(_minOrUndefined([3])).toBe(3)
  expect(_minOrUndefined([3, 2])).toBe(2)
  expect(_minOrUndefined([1, 3, 2])).toBe(1)

  expect(() => _min([])).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: _min called on empty array]`,
  )
  expect(_min([3])).toBe(3)
  expect(_min([3, 2])).toBe(2)
  expect(_min([1, 3, 2])).toBe(1)
  expect(_min(['3'])).toBe('3')
  expect(_min(['3', '2'])).toBe('2')
  expect(_min(['1', '3', '2'])).toBe('1')

  const v = _min([1, undefined])
  const _ = v + 1 // tests that v is not undefined

  expect(_min([1, undefined])).toBe(1)
  expect(_min([undefined, 1])).toBe(1)
  expect(_min([undefined, 2, 1])).toBe(1)
  expect(_min([undefined, 1, 2])).toBe(1)
})

it('should return the largest value, with _max throwing on an empty array', () => {
  expect(_maxOrUndefined([])).toBeUndefined()
  expect(_maxOrUndefined([3])).toBe(3)
  expect(_maxOrUndefined([3, 2])).toBe(3)
  expect(_maxOrUndefined([1, 3, 2])).toBe(3)

  expect(() => _max([])).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: _max called on empty array]`,
  )
  expect(_max([3])).toBe(3)
  expect(_max([3, 2])).toBe(3)
  expect(_max([1, 3, 2])).toBe(3)
  expect(_max([1, 3, 2, 4])).toBe(4)
  expect(_max(['3'])).toBe('3')
  expect(_max(['3', '2'])).toBe('3')
  expect(_max(['1', '3', '2'])).toBe('3')
  expect(_max(['1', '3', '2', '4'])).toBe('4')
})

it('should return [min, max] ignoring undefined, with _minMax throwing on an empty array', () => {
  expect(_minMaxOrUndefined([])).toBeUndefined()
  expect(_minMaxOrUndefined([3])).toEqual([3, 3])
  expect(_minMaxOrUndefined([3, 2])).toEqual([2, 3])
  expect(_minMaxOrUndefined([1, 3, 2])).toEqual([1, 3])

  expect(() => _minMax([])).toThrowErrorMatchingInlineSnapshot(
    `[Error: _minMax called on empty array]`,
  )
  expect(_minMax([3])).toEqual([3, 3])
  expect(_minMax([3, 2])).toEqual([2, 3])
  expect(_minMax([1, 3, 2])).toEqual([1, 3])
  expect(_minMax(['3'])).toEqual(['3', '3'])
  expect(_minMax(['3', '2'])).toEqual(['2', '3'])
  expect(_minMax(['1', '3', '2'])).toEqual(['1', '3'])

  const [v] = _minMax([1, undefined])
  const _ = v + 1 // tests that v is not undefined

  expect(_minMax([1, undefined])).toEqual([1, 1])
  expect(_minMax([undefined, 1])).toEqual([1, 1])
  expect(_minMax([undefined, 2, 1])).toEqual([1, 2])
  expect(_minMax([undefined, 1, 2])).toEqual([1, 2])
})

it('should return the item with the largest or smallest mapped value', () => {
  expect(_maxByOrUndefined([], () => 0)).toBeUndefined()
  expect(() => _maxBy([], () => 0)).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: _maxBy returned undefined]`,
  )
  expect(_maxByOrUndefined([{ age: 18 }, { age: 30 }], u => u.age)).toEqual({ age: 30 })
  expect(_maxBy([{ age: 18 }, { age: 30 }], u => u.age)).toEqual({ age: 30 })

  expect(_minByOrUndefined([], () => 0)).toBeUndefined()
  expect(() => _minBy([], () => 0)).toThrowErrorMatchingInlineSnapshot(
    `[AssertionError: _minBy returned undefined]`,
  )
  expect(_minByOrUndefined([{ age: 18 }, { age: 30 }], u => u.age)).toEqual({ age: 18 })
  expect(_minBy([{ age: 18 }, { age: 30 }], u => u.age)).toEqual({ age: 18 })

  expect(_minBy([{ date: '2023-06-22' }, { date: '2023-06-21' }], u => u.date)).toEqual({
    date: '2023-06-21',
  })
})

it('should return the items with the smallest and largest mapped values', () => {
  expect(_minMaxByOrUndefined([], () => 0)).toBeUndefined()
  expect(() => _minMaxBy([], () => 0)).toThrowErrorMatchingInlineSnapshot(
    `[Error: _minMaxBy called on empty array]`,
  )
  expect(_minMaxByOrUndefined([{ age: 20 }, { age: 18 }, { age: 30 }], u => u.age)).toEqual([
    { age: 18 },
    { age: 30 },
  ])
  expect(_minMaxBy([{ age: 20 }, { age: 18 }, { age: 30 }], u => u.age)).toEqual([
    { age: 18 },
    { age: 30 },
  ])
})

it('should pair the items at the same index of two arrays', () => {
  const a1 = [1, 2, 3]
  const a2 = [2, 3, 4]
  expect(_zip(a1, a2)).toEqual([
    [1, 2],
    [2, 3],
    [3, 4],
  ])

  expect(_zip(a1, a2).map(([a, b]) => a * b)).toEqual([2, 6, 12])
})
