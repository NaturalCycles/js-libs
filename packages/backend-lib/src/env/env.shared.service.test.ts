import { expect, test, vi } from 'vitest'
import type { BaseEnv, EnvSharedServiceCfg } from './env.shared.service.js'
import { EnvSharedService } from './env.shared.service.js'

interface MyEnv extends BaseEnv {
  a: string
}

const cfg: EnvSharedServiceCfg<MyEnv> = {
  environments: [
    {
      name: 'test1',
      a: 'a1',
    },
    {
      name: 'test2',
      a: 'a2',
    },
  ],
}

test('envService', () => {
  const envService = new EnvSharedService(cfg)

  // test.env.ts not found
  expect(() => envService.getEnv()).toThrow('Environment test is not defined')

  // test1
  vi.stubEnv('APP_ENV', 'test1')
  let env = envService.getEnv()
  expect(env).toEqual({
    name: 'test1',
    a: 'a1',
  })

  // test2, env cached
  vi.stubEnv('APP_ENV', 'test2')
  env = envService.getEnv()
  expect(env).toEqual({
    name: 'test1',
    a: 'a1',
  })

  // test2, env reset
  envService.setEnv()
  env = envService.getEnv()
  expect(env).toEqual({
    name: 'test2',
    a: 'a2',
  })
})
