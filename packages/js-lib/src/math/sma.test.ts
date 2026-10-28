import { expect, it } from 'vitest'
import { SimpleMovingAverage } from './sma.js'

it('should keep a moving average of the last 3 values', () => {
  const sma = new SimpleMovingAverage(3)
  expect(sma).toMatchObject({
    size: 3,
    data: [],
    avg: 0,
    nextIndex: 0,
  })

  expect(sma.pushGetAvg(1)).toBe(1)
  expect(sma).toMatchObject({
    size: 3,
    data: [1],
    avg: 1,
    nextIndex: 1,
  })

  sma.push(2)
  expect(sma).toMatchObject({
    size: 3,
    data: [1, 2],
    avg: 1.5,
    nextIndex: 2,
  })

  sma.push(4)
  expect(sma).toMatchObject({
    size: 3,
    data: [1, 2, 4],
    nextIndex: 0,
  })
  expect(sma.avg).toBeCloseTo(2.33)

  sma.push(3)
  expect(sma).toMatchObject({
    size: 3,
    data: [3, 2, 4],
    nextIndex: 1,
  })
  expect(sma.avg).toBeCloseTo(3)

  sma.push(5)
  expect(sma).toMatchObject({
    size: 3,
    data: [3, 5, 4],
    nextIndex: 2,
  })
  expect(sma.avg).toBeCloseTo(4)

  sma.push(5)
  expect(sma).toMatchObject({
    size: 3,
    data: [3, 5, 5],
    nextIndex: 0,
  })
  expect(sma.avg).toBeCloseTo(4.33)
})
