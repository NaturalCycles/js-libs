import { it } from 'vitest'
import { expectResults } from '../test/test.util.js'
import { _camelCase, _kebabCase, _snakeCase } from './case.js'

const words = [
  'Add data',
  'directorOfTrackAndTrigger',
  'directorOfOptiPush',
  'a',
  'aa',
  'aA',
  'Aa',
  'Lo Lo Lo  Lo',
  'Consent_marketing',
  'Consent_MARKETING',
  'LH test',
  'foo2bar',
  '__FOO_BAR__',
  '--FOO-BAR--',
  'la-lo-lo',
]

it('_snakeCase', () => {
  expectResults(_snakeCase, words).toMatchSnapshot()
})

it('_camelCase', () => {
  const allWords = [...words, ...words.map(w => _snakeCase(w))]
  expectResults(s => _camelCase(s), allWords).toMatchSnapshot()
})

it('_kebabCase', () => {
  expectResults(_kebabCase, words).toMatchSnapshot()
})
