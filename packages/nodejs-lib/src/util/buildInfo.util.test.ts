import { afterAll, expect, it, vi } from 'vitest'
import { generateBuildInfo } from './buildInfo.util.js'

afterAll(() => {
  process.env['APP_ENV'] = 'test' // restore
})

it('should include the repo name and not take env from an empty APP_ENV', () => {
  let buildInfo = generateBuildInfo()
  // console.log(buildInfo)
  expect(buildInfo).toMatchObject({
    repoName: 'js-libs',
    // env: 'test',
  })

  vi.stubEnv('APP_ENV', '') // to not throw on APP_ENV=test check
  buildInfo = generateBuildInfo()
  console.log(buildInfo)
  expect(buildInfo.env).not.toBe('test') // read from package.json
})
