import { afterAll, expect, test } from 'vitest'
import type { BackendRequest, BackendResponse } from '../server/server.model.js'
import { expressTestService } from '../testing/index.js'

const ipHandler = (req: BackendRequest, res: BackendResponse): void => {
  res.json({ ip: req.ip })
}

const app = await expressTestService.createAppFromResource({ path: '/ip', handler: ipHandler })

afterAll(async () => {
  await app.close()
})

test('trust proxy: uses the 2nd rightmost X-Forwarded-For entry', async () => {
  const r = await app.get<{ ip: string }>('ip', {
    headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
  })
  expect(r.ip).toBe('1.1.1.1')
})

test('trust proxy: ignores spoofed leftmost X-Forwarded-For entries', async () => {
  const r = await app.get<{ ip: string }>('ip', {
    headers: { 'x-forwarded-for': '6.6.6.6, 1.1.1.1, 2.2.2.2' },
  })
  expect(r.ip).toBe('1.1.1.1')
})
