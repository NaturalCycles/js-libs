import { afterAll, expect, test } from 'vitest'
import { debugResource } from '../test/debug.resource.js'
import { expressTestService } from '../testing/index.js'

const app = await expressTestService.createAppFromResource(debugResource)

afterAll(async () => {
  await app.close()
})

test('root resource ok', async () => {
  const r = await app.get('')
  expect(r).toEqual({ ok: 1 })
})

// This started to mysteriously fail after some Got upgrade
// todo: investigate!
test.skip('should handle async error', async () => {
  const err = await app.get('asyncError', { throwHttpErrors: false })
  expect(err).toMatchSnapshot()
})
