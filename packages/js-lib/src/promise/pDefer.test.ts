import { expect, it } from 'vitest'
import { pDefer } from './pDefer.js'

it('should resolve and reject from outside', async () => {
  let p = pDefer<string>()
  p.resolve('a')
  expect(await p).toBe('a')

  p = pDefer<string>()
  p.reject(new Error('abc'))
  await expect(p).rejects.toThrow('abc')
})
