import { expect, it } from 'vitest'
import { LazyKeySortedMap } from './lazyKeySortedMap.js'

it('should update existing keys passed to setMany without duplicating them in the key order', () => {
  const map = new LazyKeySortedMap<string, number>([
    ['bravo', 2],
    ['delta', 4],
  ])

  map.setMany({ delta: 40, charlie: 3, bravo: 20, alpha: 1 })

  expect(map.size).toBe(4)
  expect(map.keys().toArray()).toEqual(['alpha', 'bravo', 'charlie', 'delta'])
  expect(map.values().toArray()).toEqual([1, 20, 3, 40])
})
