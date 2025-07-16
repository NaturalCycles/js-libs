import { expect, test } from 'vitest'
import { z } from '../zod/customZod.js'
import { zIsValid } from '../zod/zod.util.js'
import { SIMPLE_EMAIL_REGEX } from './regex.js'

test.each(['a@b.cc', 'kirill@naturalcycles.com', 'kirill@naturalcycles.co.uk'])(
  'email valid %',
  s => {
    expect(s).toMatch(SIMPLE_EMAIL_REGEX)
    // cross-check with Zod
    expect(zIsValid(s, z.email())).toBe(true)
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
  // cross-check with Zod
  expect(zIsValid(s, z.email())).toBe(false)
})
