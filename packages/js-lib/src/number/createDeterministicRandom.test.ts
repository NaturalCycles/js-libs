import { expect, it } from 'vitest'
import { _range } from '../array/index.js'
import { _createDeterministicRandom } from './createDeterministicRandom.js'

it('should start every new generator with the same sequence', () => {
  const firstRandom = _createDeterministicRandom()
  const firstNumbers = _range(30).map(() => firstRandom())

  const secondRandom = _createDeterministicRandom()
  const secondNumbers = _range(30).map(() => secondRandom())

  expect(firstNumbers[0]).toBe(0.9872818551957607)
  expect(secondNumbers).toStrictEqual(firstNumbers)
})
