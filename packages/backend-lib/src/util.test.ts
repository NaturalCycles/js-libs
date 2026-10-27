import { expect, it } from 'vitest'
import { isCloudRun } from './util.js'

it('isCloudRun', () => {
  expect(isCloudRun()).toBe(false)
})
