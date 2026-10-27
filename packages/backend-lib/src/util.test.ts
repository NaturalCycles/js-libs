import { expect, it } from 'vitest'
import { isCloudRun } from './util.js'

it('should return false outside Cloud Run', () => {
  expect(isCloudRun()).toBe(false)
})
