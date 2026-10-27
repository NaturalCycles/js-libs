import { expect, it } from 'vitest'

it('should use the real clock by default', () => {
  const d = new Date()
  console.log(d)
  expect(d.getFullYear()).toBeGreaterThan(2018)
})
