import { pExpectedError } from '@naturalcycles/js-lib/error'
import { getFetcher } from '@naturalcycles/js-lib/http'
import { _stringify } from '@naturalcycles/js-lib/string/stringify.js'
import { expect, test, vi } from 'vitest'

const fetcher = getFetcher({
  retry: { count: 0 },
})

const detectLeaks = process.argv.some(a => a.includes('detectLeaks'))

test('should throw on network connections', async () => {
  if (detectLeaks) return // skip test on detectLeaks where testOffline is disabled

  const stderrWrite = vi.spyOn(process.stderr, 'write').mockReturnValue(true)

  const err = await pExpectedError(fetcher.get('http://example.com'))
  expect(_stringify(err)).toMatchInlineSnapshot(`
    "HttpRequestError: GET http://example.com/
    Caused by: TypeError: fetch failed
    Caused by: AppError: Network request forbidden by testOffline: example.com"
  `)

  // The alert should point to the test (and its file) that made the request
  const alert = stderrWrite.mock.calls.map(([chunk]) => String(chunk)).join('')
  expect(alert).toContain('Network request forbidden by testOffline: example.com')
  expect(alert).toContain('test: should throw on network connections')
  expect(alert).toContain('file: ')
  expect(alert).toContain('testOffline.test.ts')
})

test('should allow connection to local hosts', async () => {
  await fetcher.get('http://localhost').catch(_ => {})
})
