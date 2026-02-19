import { j } from '@naturalcycles/nodejs-lib/ajv'
import { expect, test } from 'vitest'
import { SIMPLE_EMAIL_REGEX } from './regex.js'

const simpleEmailRegexSchema = j.string().regex(SIMPLE_EMAIL_REGEX)

test.each(['a@b.cc', 'kirill@naturalcycles.com', 'kirill@naturalcycles.co.uk'])(
  'email valid %',
  s => {
    expect(s).toMatch(SIMPLE_EMAIL_REGEX)
    // cross-check with J
    expect(simpleEmailRegexSchema.isValid(s)).toBe(true)
  },
)

test.each([
  'kirill@@naturalcycles.com',
  'kirill@naturalcycles..com',
  'kirill@naturalcyclescom',
  'kirillnaturalcycles.com',
  '@kirillnaturalcycles.com',
  'kirill@naturalcycles.com@',
])('email invalid %', s => {
  expect(s).not.toMatch(SIMPLE_EMAIL_REGEX)
  // cross-check with J
  expect(simpleEmailRegexSchema.isValid(s)).toBe(false)
})
