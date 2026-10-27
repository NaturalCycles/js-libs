import { expect, it } from 'vitest'
import { _range } from '../array/index.js'
import { _createDeterministicRandom } from './createDeterministicRandom.js'

it('should start every new generator with the same number', () => {
  let deterministicRandom = _createDeterministicRandom()
  let numbers = _range(30).map(() => deterministicRandom())
  expect(numbers[0]).toBe(0.9872818551957607)

  deterministicRandom = _createDeterministicRandom()
  numbers = _range(30).map(() => deterministicRandom())
  expect(numbers[0]).toBe(0.9872818551957607)
})
