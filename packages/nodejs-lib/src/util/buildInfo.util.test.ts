import { expect, test, vi } from 'vitest'
import { generateBuildInfo } from './buildInfo.util.js'

test('generateBuildInfo', () => {
  let buildInfo = generateBuildInfo()
  // console.log(buildInfo)
  expect(buildInfo).toMatchObject({
    repoName: 'js-libs',
    env: 'test',
  })

  vi.stubEnv('APP_ENV', '') // to not throw on APP_ENV=test check
  buildInfo = generateBuildInfo()
  console.log(buildInfo)
  expect(buildInfo.env).not.toBe('test') // read from package.json
})
