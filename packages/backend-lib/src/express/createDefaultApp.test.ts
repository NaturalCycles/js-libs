import { afterAll, expect, it } from 'vitest'
import type { BackendRequest, BackendResponse } from '../server/server.model.js'
import { expressTestService } from '../testing/index.js'

const ipHandler = (req: BackendRequest, res: BackendResponse): void => {
  res.json({ ip: req.ip })
}

const app = await expressTestService.createAppFromResource({ path: '/ip', handler: ipHandler })

afterAll(async () => {
  await app.close()
})

it('should take req.ip from the second rightmost X-Forwarded-For entry', async () => {
  const r = await app.get<{ ip: string }>('ip', {
    headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
  })
  expect(r.ip).toBe('1.1.1.1')
})

it('should ignore spoofed leftmost X-Forwarded-For entries', async () => {
  const r = await app.get<{ ip: string }>('ip', {
    headers: { 'x-forwarded-for': '6.6.6.6, 1.1.1.1, 2.2.2.2' },
  })
  expect(r.ip).toBe('1.1.1.1')
})

it('should allow the QUERY method in a CORS preflight', async () => {
  const res = await fetch(`${app.cfg.baseUrl}/ip`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://example.com',
      'access-control-request-method': 'QUERY',
    },
  })
  expect(res.status).toBe(204)
  expect(res.headers.get('access-control-allow-methods')?.split(',')).toContain('QUERY')
})

it('should parse the json body of a QUERY request', async () => {
  await using queryApp = await expressTestService.createAppFromResource({
    path: '/echo',
    handler: (req, res) => {
      res.json({ method: req.method, body: req.body })
    },
  })

  const r = await queryApp.query('echo', { json: { a: 1 } })
  expect(r).toEqual({ method: 'QUERY', body: { a: 1 } })
})
