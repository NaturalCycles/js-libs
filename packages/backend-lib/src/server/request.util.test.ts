import { expect, test } from 'vitest'
import { getRequestEndpoint, getRequestEndpointUnsafe } from './request.util.js'
import type { BackendRequest } from './server.model.js'

function mockReq(req: {
  method: string
  baseUrl: string
  path: string
  route?: { path: string }
}): BackendRequest {
  return req as any
}

test('matched route: uses the route pattern, not the actual path', () => {
  const req = mockReq({
    method: 'GET',
    baseUrl: '/API',
    path: '/users/123',
    route: { path: '/users/:id' },
  })
  expect(getRequestEndpoint(req)).toBe('GET /api/users/:id')
  expect(getRequestEndpointUnsafe(req)).toBe('GET /api/users/:id')
})

test('unmatched route: uses the actual path', () => {
  const req = mockReq({ method: 'POST', baseUrl: '', path: '/Some/Path/' })
  expect(getRequestEndpoint(req)).toBe('POST /some/path')
  expect(getRequestEndpointUnsafe(req)).toBe('POST /some/path')
})

test('stripPrefix', () => {
  const req = mockReq({ method: 'GET', baseUrl: '/api/v2', path: '/users/' })
  expect(getRequestEndpoint(req, '/api/v2')).toBe('GET /users')
  expect(getRequestEndpoint(req, '/other')).toBe('GET /api/v2/users')
})

test.each([
  // Node's http parser accepts these in a raw request path
  ['/<img/src=x/onerror=alert(1)>', '/_img/src=x/onerror=alert_1__'],
  [`/'"<>&\`{}\\|^[]`, '/_____________'],
  // these can't come through http, but are handled anyway
  ['/a b\n', '/a_b_'],
  ['/ü/😀', '/_/_'],
  // allowed as-is: letters, digits and inert url punctuation
  ['/a-b_c.d~e:f@g!h$i*j+k,l;m=n/%2F', '/a-b_c.d~e:f@g!h$i*j+k,l;m=n/%2f'],
])('unmatched route: path %s is sanitized to %s', (path, expected) => {
  const req = mockReq({ method: 'GET', baseUrl: '', path })
  expect(getRequestEndpoint(req)).toBe(`GET ${expected}`)
  expect(getRequestEndpointUnsafe(req)).toBe(`GET ${path.toLowerCase()}`)
})

test('matched route: baseUrl (mount path params) is sanitized, route pattern is not', () => {
  const req = mockReq({
    method: 'GET',
    baseUrl: '/t/<b>',
    path: '/x/1',
    route: { path: '/x/:id{/:tab}' },
  })
  expect(getRequestEndpoint(req)).toBe('GET /t/_b_/x/:id{/:tab}')
  expect(getRequestEndpointUnsafe(req)).toBe('GET /t/<b>/x/:id{/:tab}')
})
