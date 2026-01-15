import { afterAll, expect, test } from 'vitest'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import { expressTestService } from '../testing/index.js'

// Create a resource that returns data large enough to trigger compression (>1024 bytes)
const router = getDefaultRouter()
router.get('/', async (_req, res) => {
  const largeData = { data: 'x'.repeat(2000) }
  res.json(largeData)
})

const app = await expressTestService.createAppFromResource(router)

afterAll(async () => {
  await app.close()
})

test('should prefer zstd over other encodings when client supports all', async () => {
  const { fetchResponse } = await app.doFetch({
    headers: { 'Accept-Encoding': 'gzip, deflate, br, zstd' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('zstd')
})

test('should prefer zstd even when gzip comes first in Accept-Encoding', async () => {
  // This is the Chrome scenario - gzip listed first but zstd should still be preferred
  const { fetchResponse } = await app.doFetch({
    headers: { 'Accept-Encoding': 'gzip, deflate, br, zstd' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('zstd')
})

test('should use br when zstd is not accepted', async () => {
  const { fetchResponse } = await app.doFetch({
    headers: { 'Accept-Encoding': 'gzip, deflate, br' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('br')
})

test('should use gzip when only gzip is accepted', async () => {
  const { fetchResponse } = await app.doFetch({
    headers: { 'Accept-Encoding': 'gzip' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('gzip')
})

test('should use deflate when only deflate is accepted', async () => {
  const { fetchResponse } = await app.doFetch({
    headers: { 'Accept-Encoding': 'deflate' },
  })

  expect(fetchResponse?.headers.get('Content-Encoding')).toBe('deflate')
})

test('should not compress when response is below threshold', async () => {
  const smallRouter = getDefaultRouter()
  smallRouter.get('/', async (_req, res) => {
    res.json({ ok: 1 }) // Small response, below 1024 byte threshold
  })

  const smallApp = await expressTestService.createAppFromResource(smallRouter)

  try {
    const { fetchResponse } = await smallApp.doFetch({
      headers: { 'Accept-Encoding': 'gzip, deflate, br, zstd' },
    })

    expect(fetchResponse?.headers.get('Content-Encoding')).toBeNull()
  } finally {
    await smallApp.close()
  }
})
