import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, it } from 'vitest'
import { onHeaders } from './onHeaders.js'

type Handler = (req: IncomingMessage, res: ServerResponse) => void

it('should call the listener once before an implicit writeHead and let it modify headers', async () => {
  let calls = 0
  const res = await request((_req, res) => {
    onHeaders(res, function () {
      calls++
      expect(this).toBe(res)
      expect(this.headersSent).toBe(false)
      this.setHeader('X-Listener', 'yes')
    })
    res.write('a')
    res.end('b')
  })
  expect(calls).toBe(1)
  expect(res.headers.get('x-listener')).toBe('yes')
  expect(await res.text()).toBe('ab')
})

it('should let the listener see and modify the headers passed to writeHead', async () => {
  const res = await request((_req, res) => {
    onHeaders(res, () => {
      expect(res.statusCode).toBe(201)
      expect(res.getHeader('X-Remove')).toBe('1')
      res.removeHeader('X-Remove')
    })
    res.writeHead(201, { 'X-Keep': '1', 'X-Remove': '1', '': 'ignored' }).end()
  })
  expect(res.status).toBe(201)
  expect(res.headers.get('x-keep')).toBe('1')
  expect(res.headers.has('x-remove')).toBe(false)
})

it('should keep the reason phrase unless the listener changes statusCode', async () => {
  const kept = await request((_req, res) => {
    onHeaders(res, () => {})
    res.writeHead(200, 'Custom OK', { 'X-A': '1' }).end()
  })
  expect(kept.statusText).toBe('Custom OK')
  expect(kept.headers.get('x-a')).toBe('1')

  const changed = await request((_req, res) => {
    onHeaders(res, () => (res.statusCode = 202))
    res.writeHead(200, 'Custom OK').end()
  })
  expect(changed.status).toBe(202)
  expect(changed.statusText).toBe('Accepted')
})

it('should accept 2D and raw header arrays and throw on a malformed one', async () => {
  const res2d = await request((_req, res) => {
    onHeaders(res, () => expect(res.getHeader('X-A')).toBe('1'))
    res.writeHead(200, [['X-A', '1']] as any).end()
  })
  expect(res2d.headers.get('x-a')).toBe('1')

  const res1d = await request((_req, res) => {
    res.setHeader('X-A', 'old')
    onHeaders(res, () => expect(res.getHeader('X-A')).toEqual(['1', '2']))
    res.writeHead(200, ['X-A', '1', 'X-A', '2']).end()
  })
  expect(res1d.headers.get('x-a')).toBe('1, 2')

  await request((_req, res) => {
    onHeaders(res, () => {})
    expect(() => res.writeHead(200, ['X-A'])).toThrow('headers array is malformed')
    res.end()
  })
})

async function request(handler: Handler): Promise<Response> {
  const server = createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
    await res.clone().arrayBuffer()
    return res
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
}
