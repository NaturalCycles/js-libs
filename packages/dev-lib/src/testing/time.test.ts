import { newDate } from '@naturalcycles/js-lib/datetime/time.util.js'
import { expect, it } from 'vitest'

it('should use the real clock by default', () => {
  const d = newDate()
  console.log(d)
  expect(d.getFullYear()).toBeGreaterThan(2018)
})
