import { expect, it } from 'vitest'
import { pDelay } from './pDelay.js'
import { pHang } from './pHang.js'
import { pState } from './pState.js'

it('should return a promise that stays pending', async () => {
  const promise = pHang()

  await pDelay()

  expect(await pState(promise)).toBe('pending')
})
