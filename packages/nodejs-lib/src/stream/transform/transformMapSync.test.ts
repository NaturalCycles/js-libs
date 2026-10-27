import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { AppError, ErrorMode, pTry } from '@naturalcycles/js-lib/error'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { Pipeline } from '../index.js'
import type { TransformMapStats } from '../index.js'

interface Item {
  id: string
}

beforeAll(() => {
  vi.setSystemTime(MOCK_TS_2018_06_21 * 1000)
})

afterAll(() => {
  vi.useRealTimers()
})

it('should call the mapper for every item', async () => {
  const data: Item[] = _range(1, 4).map(n => ({ id: String(n) }))
  const data2: Item[] = []

  await Pipeline.fromArray(data)
    .mapSync(r => void data2.push(r))
    .run()

  expect(data2).toEqual(data)
  // expect(readable.destroyed).toBe(true)
})

it('should reject with the mapper error, stop at the failing item and report stats', async () => {
  let stats: TransformMapStats
  const data = _range(100).map(String)

  const data2: string[] = []
  const [err] = await pTry(
    Pipeline.fromArray(data)
      .mapSync(
        (r, i) => {
          if (i === 50) {
            throw new AppError('error on 50th')
          }

          data2.push(r)
        },
        {
          onDone: s => (stats = s),
        },
      )
      .run(),
  )

  expect(err).toBeInstanceOf(AppError)
  expect(err).toMatchInlineSnapshot(`[AppError: error on 50th]`)

  expect(data2).toEqual(data.slice(0, 50))

  expect(stats!).toMatchInlineSnapshot(`
{
  "collectedErrors": [],
  "countErrors": 1,
  "countIn": 51,
  "countOut": 50,
  "ok": false,
  "started": 1529539200000,
}
`)
})

it('should skip the failing item and report ok stats in SUPPRESS mode', async () => {
  let stats: TransformMapStats
  const data = _range(100).map(String)

  const data2: string[] = []
  await Pipeline.fromArray(data)
    .mapSync(
      (r, i) => {
        if (i === 50) {
          throw new AppError('error on 50th')
        }

        data2.push(r)
      },
      {
        errorMode: ErrorMode.SUPPRESS,
        onDone: s => (stats = s),
      },
    )
    .run()

  expect(data2).toEqual(data.filter(r => r !== '50'))

  expect(stats!).toMatchInlineSnapshot(`
{
  "collectedErrors": [],
  "countErrors": 1,
  "countIn": 100,
  "countOut": 99,
  "ok": true,
  "started": 1529539200000,
}
`)
})
