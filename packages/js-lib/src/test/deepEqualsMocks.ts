const date1 = new Date('2024-03-28T14:47:11.520Z')
const date11 = new Date('2024-03-28T14:47:11.520Z')
const date2 = new Date('2024-03-28T14:44:12.520Z')

// class that overrides toJSON
class A {
  constructor(public v: string) {}
  toJSON(): string {
    return this.v
  }
}

export const deepEqualsMocks: [
  v1: any,
  v2: any,
  jsonEquals: boolean | 'error',
  deepJsonEquals: boolean,
  deepEquals: boolean,
][] = [
  [undefined, undefined, 'error', true, true],
  [undefined, null, 'error', false, false],
  [null, null, true, true, true],
  [null, '', false, false, false],
  // NaN stringify to null
  [null, NaN, true, true, false],
  [0, '', false, false, false],
  [0, -0, true, true, true],
  [5, 5, true, true, true],
  // oxlint-disable-next-line unicorn/no-zero-fractions
  [-1, -1.0, true, true, true],
  // oxlint-disable-next-line unicorn/no-zero-fractions
  [-1.01, -1.0, false, false, false],
  [true, true, true, true, true],
  [true, false, false, false, false],
  [false, true, false, false, false],
  [false, false, true, true, true],
  [false, undefined, 'error', false, false],
  ['', '', true, true, true],
  ['1', '1', true, true, true],
  ['1', 1, false, false, false],
  ['abc', 'abc', true, true, true],
  ['abcdef', 'abcdeg', false, false, false],
  // functions stringify to undefined
  [undefined, (): void => {}, 'error', true, false],
  // arrays
  [[], [], true, true, true],
  [[], undefined, 'error', false, false],
  [[], [1], false, false, false],
  [[1], [1], true, true, true],
  [[1, 2, 3], [1, 2, 3], true, true, true],
  [[1, 2, 3], [1, 3, 2], false, false, false],
  [[1, 2, {}], [1, 2, {}], true, true, true],
  [[1, 2, { a: 'aa' }], [1, 2, { a: 'aa' }], true, true, true],
  // objects
  [{}, {}, true, true, true],
  [{}, undefined, 'error', false, false],
  [{ a: 'aa' }, { a: 'aa' }, true, true, true],
  // important: undefined values are removed from JSON, that's why the below are equals
  [{ a: 'aa' }, { a: 'aa', b: undefined }, true, true, true],
  [{ a: 'aa' }, { b: undefined, a: 'aa' }, true, true, true],
  [{ a: 'aa' }, { a: 'aa', b: null }, false, false, false],
  // This is where jsonEquals falls short - just the order of object keys is different
  [{ a: 'aa', c: 'cc' }, { c: 'cc', a: 'aa' }, false, true, true],
  [
    { a: 'aa', c: 'cc', d: { d2: 'dd' } },
    { c: 'cc', d: { d2: 'dd', d4: undefined }, a: 'aa' },
    false,
    true,
    true,
  ],
  // weird things
  // [Any] Regex stringify to {}
  [/a/, /a/, true, true, true],
  [/a/, /abc/, true, true, false],
  // [Any] Map stringify to {}
  [new Map(), new Map(), true, true, true],
  [new Map(), new Map([[1, 2]]), true, true, false],
  // [Any] Set stringify to {}
  [new Set(), new Set(), true, true, true],
  [new Set(), new Set([1]), true, true, false],
  [new Set(), {}, true, true, false],
  // Date strigifies to string like '2024-03-28T14:47:11.520Z'
  [date1, date11, true, true, true],
  [date1, date2, false, false, false],
  [date2, date11, false, false, false],
  // Objects of class A that overrides toJSON should be compared by toJSON
  [new A('a'), new A('a'), true, true, true],
  [new A('a'), new A('a2'), false, false, false],
  [new A('a'), 'a', true, true, false],
  [new A('a5'), 'a5', true, true, false],
]
