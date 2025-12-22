import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { generateBuildInfoDev } from './buildInfo.js'

beforeEach(() => {
  vi.setSystemTime(MOCK_TS_2018_06_21 * 1000)
})

afterEach(() => {
  vi.useRealTimers()
})

test('buildInfo', () => {
  expect(generateBuildInfoDev()).toMatchInlineSnapshot(`
    {
      "branchName": "devBranch",
      "env": "dev",
      "repoName": "devRepo",
      "rev": "devRev",
      "ts": 1529539200,
      "tsCommit": 1529539200,
      "ver": "20180621_0000_devRepo_devBranch_devRev",
    }
  `)
})
