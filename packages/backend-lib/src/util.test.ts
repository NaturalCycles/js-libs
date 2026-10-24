import { expect, test } from 'vitest'
import { isCloudRun } from './util.js'

test('isCloudRun', () => {
  expect(isCloudRun()).toBe(false)
})
