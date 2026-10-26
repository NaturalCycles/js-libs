import { expect, it } from 'vitest'
import { AccumulatingAverage } from './accumulatingAverage.js'

it('simple', () => {
  const aa = new AccumulatingAverage()
  expect(aa.average).toBe(0)
  expect(aa.total).toBe(0)
  expect(aa.count).toBe(0)

  aa.add(1)
  expect(aa.average).toBe(1)
  expect(aa.total).toBe(1)
  expect(aa.count).toBe(1)

  aa.add(3)
  expect(aa.average).toBe(2)
  expect(aa.total).toBe(4)
  expect(aa.count).toBe(2)

  aa.add(5)
  expect(aa.average).toBe(3)
  expect(aa.total).toBe(9)
  expect(aa.count).toBe(3)

  aa.add(12)
  expect(aa.average).toBe((1 + 3 + 5 + 12) / 4)
  expect(aa.total).toBe(1 + 3 + 5 + 12)
  expect(aa.count).toBe(4)

  aa.reset()
  expect(aa.average).toBe(0)
  expect(aa.total).toBe(0)
  expect(aa.count).toBe(0)
})
