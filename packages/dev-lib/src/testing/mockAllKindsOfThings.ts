import { AppError } from '@naturalcycles/js-lib/error'

export const mockAllKindsOfThings = (): any[] => {
  const errorWithCode = new Error('Error with code')
  Object.assign(errorWithCode, {
    code: `auth/forbidden`,
  })

  return [
    undefined,
    null,
    true,
    false,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    '',
    ' ',
    'ho ho ho',
    '{',
    '{"a": "a1"}',
    '[5, null, "s"]',
    [5, null, 's'],
    15,
    [1, 2, 3],
    {
      a: 'a1',
      b: 'b1',
      c: {
        d: 25,
        e: undefined,
      },
    },
    {
      message: 'Reference already exists',
      documentation_url: 'https://developer.github.com/v3/git/refs/#create-a-reference',
    },
    function abc() {
      console.log('inside abc')
    },
    /i am regex, who are you?/,
    new Map([['a', 'b']]),
    new Set(['a', 'b', 'c']),
    new Error('some err msg'),
    errorWithCode,
    new AppError('app error', {
      k1: 'v1',
    }),
    Symbol('a_am_symbol'),
    new Date(1984, 5, 21),
  ]
}
