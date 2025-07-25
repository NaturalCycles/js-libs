import { expect, test, vi } from 'vitest'
import { _createDeterministicRandom } from '../number/createDeterministicRandom.js'
import { _deepFreeze } from '../object/object.util.js'
import type { AbortablePredicate, Mapper } from '../types.js'
import { END } from '../types.js'
import {
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
  _groupBy,
  _intersection,
  _intersectsWith,
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
  _minOrUndefined,
  _pushUniq,
  _pushUniqBy,
  _shuffle,
  _sortBy,
  _sum,
  _sumBy,
  _takeRightWhile,
  _takeWhile,
  _uniq,
  _uniqBy,
  _zip,
} from './array.util.js'
import { _range } from './range.js'

test('_chunk', () => {
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
})

test('_uniq', () => {
  const a = [1, 2, 2, 1, 3, 5, 3, 4]
  expect(_uniq(a)).toEqual([1, 2, 3, 5, 4])
})

test('_pushUniq', () => {
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

test('_uniqBy', () => {
  const a = [1, 2, 2, 1, 3, 5, 3, 4]
  expect(_uniqBy(a, a => a)).toEqual([1, 2, 3, 5, 4])

  expect(_uniqBy([2.1, 1.2, 2.3], Math.floor)).toEqual([2.1, 1.2])

  expect(_uniqBy([{ x: 1 }, { x: 2 }, { x: 1 }], r => r.x)).toEqual([{ x: 1 }, { x: 2 }])
})

test('_pushUniqBy', () => {
  const a = [1, 2]
  const floorMapper: Mapper<number, number> = n => Math.floor(n)
  expect(_pushUniqBy(a, floorMapper)).toEqual([1, 2])
  expect(_pushUniqBy(a, floorMapper)).toBe(a)
  expect(_pushUniqBy(a, floorMapper, 1.1, 1.2, 1.5, 1.9, 2, 2.3, 3.1, 3.2)).toEqual([1, 2, 3.1])
})

test('_by', () => {
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

test('_mapBy', () => {
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

test('_groupBy', () => {
  expect(_groupBy(_range(5), n => (n % 2 ? 'odd' : 'even'))).toEqual({
    even: [0, 2, 4],
    odd: [1, 3],
  })
})

test('_sortBy', () => {
  const a = [{ age: 20 }, { age: 10 }]
  _deepFreeze(a)
  expect(_sortBy(a, r => r.age)).toEqual([{ age: 10 }, { age: 20 }])
  expect(_sortBy(a, o => o.age)).toEqual([{ age: 10 }, { age: 20 }])
  expect(_sortBy(a, o => o.age, { dir: 'desc' })).toEqual([{ age: 20 }, { age: 10 }])
})

test('_sortBy with mutation', () => {
  const a = [{ age: 20 }, { age: 10 }]
  const r = _sortBy(a, r => r.age, { mutate: true })
  expect(r).toEqual([{ age: 10 }, { age: 20 }])
  expect(r).toBe(a)
})

test('_find', () => {
  expect(_find([1, 2, 3, 4], n => n % 2 === 0)).toBe(2)
  expect(_find([1, 2, 3, 4], n => (n === 2 ? END : false))).toBeUndefined()
})

test('_findLast', () => {
  expect(_findLast([1, 2, 3, 4], n => n % 2 === 1)).toBe(3)
  expect(_findLast([1, 2, 3, 4], n => (n === 2 ? END : false))).toBeUndefined()
})

test('_takeWhile', () => {
  expect(_takeWhile([1, 2, 3, 4, 5, 2, 1], v => v <= 3)).toEqual([1, 2, 3])
  expect(_takeWhile([1, 2, 3, 4, 5, 2, 1], v => v > 5)).toEqual([])
})

test('_takeRightWhile', () => {
  expect(_takeRightWhile([1, 2, 3, 4, 5, 2, 1], v => v <= 3)).toEqual([1, 2])
  expect(_takeRightWhile([1, 2, 3, 4, 5, 2, 1], v => v > 5)).toEqual([])
})

test('_dropWhile', () => {
  expect(_dropWhile([1, 2, 3, 4, 5, 2, 1], v => v <= 3)).toEqual([4, 5, 2, 1])
  expect(_dropWhile([1, 2, 3, 4, 5, 2, 1], v => v > 5)).toEqual([1, 2, 3, 4, 5, 2, 1])
  expect(_dropWhile([1, 2, 3, 4, 5, 2, 1], v => v < 10)).toEqual([])
})

test('_dropRightWhile', () => {
  expect(_dropRightWhile([1, 2, 3, 4, 5, 2, 1], v => v <= 3)).toEqual([1, 2, 3, 4, 5])
  expect(_dropRightWhile([1, 2, 3, 4, 5, 2, 1], v => v > 5)).toEqual([1, 2, 3, 4, 5, 2, 1])
  expect(_dropRightWhile([1, 2, 3, 4, 5, 2, 1], v => v < 10)).toEqual([])
})

test('_count', () => {
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

test('_countBy', () => {
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

test('_intersection', () => {
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
  expect(f([1], new Set([]))).toEqual([])
  expect(f([1], new Set([1]))).toEqual([1])
  expect(f([1], new Set([1, 2]))).toEqual([1])
  expect(f([1], new Set([2]))).toEqual([])
  expect(f([2, 1], new Set([2, 3]))).toEqual([2])
})

test('_intersectsWith', () => {
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

test('_difference', () => {
  const f = _difference
  expect(f([1], [1])).toEqual([])
  expect(f([1], [1, 2])).toEqual([])
  expect(f([1, 2], [2])).toEqual([1])
  expect(f([2, 1], [2, 3])).toEqual([1])
  expect(f([2, 1], [3])).toEqual([2, 1])
  expect(f([2, 4, 1], [2, 3])).toEqual([4, 1])
})

test('_mapToObject', () => {
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

test('_shuffle', () => {
  const a = [1, 2, 3, 4, 5]
  Object.freeze(a) // should not be mutated

  const deterministicRandom = _createDeterministicRandom()
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

test.each([
  [[], 0],
  [[2], 2],
  [[-1, 4], 3],
])('_sum %s == %s', (items: number[], result: number) => {
  expect(_sum(items)).toBe(result)
})

test('_sumBy', () => {
  const items = [
    { a: 1 },
    { a: 2 },
    { b: 3 }, // a is undefined
  ]

  expect(_sumBy(items, i => i.a)).toBe(3)
})

test('_last', () => {
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

test('_first', () => {
  expect(() => _first([])).toThrowErrorMatchingInlineSnapshot(
    `[Error: _first called on empty array]`,
  )
  expect(_first([undefined])).toBeUndefined()
  expect(_first([1, undefined])).toBe(1)
  expect(_first([1, 2])).toBe(1)
  expect(_first([1])).toBe(1)
})

test('_min', () => {
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
  const _r = v + 1 // tests that v is not undefined

  expect(_min([1, undefined])).toBe(1)
  expect(_min([undefined, 1])).toBe(1)
  expect(_min([undefined, 2, 1])).toBe(1)
  expect(_min([undefined, 1, 2])).toBe(1)
})

test('_max', () => {
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

test('_maxBy, _minBy', () => {
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

test('_zip', () => {
  const a1 = [1, 2, 3]
  const a2 = [2, 3, 4]
  expect(_zip(a1, a2)).toEqual([
    [1, 2],
    [2, 3],
    [3, 4],
  ])

  expect(_zip(a1, a2).map(([a, b]) => a * b)).toEqual([2, 6, 12])
})
