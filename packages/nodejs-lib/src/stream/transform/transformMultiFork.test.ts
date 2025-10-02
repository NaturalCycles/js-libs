import { _range } from '@naturalcycles/js-lib/array'
import type { Predicate } from '@naturalcycles/js-lib/types'
import { expect, test } from 'vitest'
import { Pipeline } from '../pipeline.js'
import { transformMultiFork } from './transformMultiFork.js'

test('transformMultiFork', async () => {
  const splitPredicate: Predicate<number> = (_, i) => {
    return i % 3 === 0
  }
  const arrays: number[][] = []

  await Pipeline.fromArray(_range(10))
    .transform(
      transformMultiFork(
        splitPredicate,
        async pipeline => {
          const array = await pipeline.toArray()
          arrays.push(array)
        },
        {
          logLevel: 'debug',
        },
      ),
    )
    .run()

  expect(arrays).toMatchInlineSnapshot(`
    [
      [
        0,
        1,
        2,
      ],
      [
        3,
        4,
        5,
      ],
      [
        6,
        7,
        8,
      ],
      [
        9,
      ],
    ]
  `)
})
