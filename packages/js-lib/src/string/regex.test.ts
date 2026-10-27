import { j } from '@naturalcycles/nodejs-lib/ajv'
import { expect, it } from 'vitest'
import { SIMPLE_EMAIL_REGEX } from './regex.js'

const simpleEmailRegexSchema = j.string().regex(SIMPLE_EMAIL_REGEX)

it.each(['a@b.cc', 'kirill@naturalcycles.com', 'kirill@naturalcycles.co.uk'])(
  'should accept the valid email %s',
  s => {
    expect(s).toMatch(SIMPLE_EMAIL_REGEX)
    // cross-check with J
    expect(simpleEmailRegexSchema.isValid(s)).toBe(true)
  },
)

it.each([
  'kirill@@naturalcycles.com',
  'kirill@naturalcycles..com',
  'kirill@naturalcyclescom',
  'kirillnaturalcycles.com',
  '@kirillnaturalcycles.com',
  'kirill@naturalcycles.com@',
])('should reject the invalid email %s', s => {
  expect(s).not.toMatch(SIMPLE_EMAIL_REGEX)
  // cross-check with J
  expect(simpleEmailRegexSchema.isValid(s)).toBe(false)
})
