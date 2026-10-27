import { afterAll, expect, it, vi } from 'vitest'
import { fs2 } from '../fs/fs2.js'
import { generateBuildInfo } from './buildInfo.util.js'

// unstubGlobals/unstubEnvs run before each test, so the last test's stubs would leak into the next file
afterAll(() => {
  vi.unstubAllEnvs()
  process.env['APP_ENV'] = 'test' // restore
})

it('should include the repo name and the branch name, and take env from APP_ENV', () => {
  vi.stubEnv('APP_ENV', 'abc')

  const buildInfo = generateBuildInfo({ overrideBranchName: 'my-branch' })
  // console.log(buildInfo)
  expect(buildInfo).toMatchObject({
    repoName: 'js-libs',
    branchName: 'my-branch',
    env: 'abc',
  })
})

it.each([
  ['master', 'master'],
  ['my-branch', 'branch'],
])(
  'should take env from envByBranch in package.json for branch %s when APP_ENV is empty',
  (branchName, env) => {
    vi.stubEnv('APP_ENV', '')
    vi.spyOn(fs2, 'readJson').mockReturnValue({
      envByBranch: {
        master: 'master',
        '*': 'branch',
      },
    })

    expect(generateBuildInfo({ overrideBranchName: branchName }).env).toBe(env)
    expect(fs2.readJson).toHaveBeenCalledExactlyOnceWith('package.json')
  },
)
