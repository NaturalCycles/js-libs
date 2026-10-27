import { expect, it } from 'vitest'
import { _range } from '../array/range.js'
import { pDelay } from '../promise/pDelay.js'
import { _SwarmSafe } from './swarmSafe.decorator.js'

class C {
  ranTimes = 0

  @_SwarmSafe()
  async run(n: number): Promise<number> {
    this.ranTimes++
    await pDelay(1)
    return n * 2
  }
}

it('should run every sequential call', async () => {
  const c = new C()

  for (const _ of _range(10)) {
    const r = await c.run(1)
    expect(r).toBe(2)
  }

  expect(c.ranTimes).toBe(10)
})

it('should run parallel calls once, resolving all with the result of the first', async () => {
  const c = new C()

  const [r1, r2, r3] = await Promise.all([
    c.run(1),
    c.run(2),
    c.run(3),
    c.run(4),
    c.run(5),
    c.run(6),
    c.run(7),
  ])

  expect(c.ranTimes).toBe(1)
  expect(r1).toBe(2)
  expect(r2).toBe(2)
  expect(r3).toBe(2)

  // Then, run again
  const r = await c.run(2)
  expect(r).toBe(4)
  expect(c.ranTimes).toBe(2)
})
