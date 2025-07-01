import { Readable } from 'node:stream'
import { mockTime } from '@naturalcycles/dev-lib/testing/time'
import { _range, AppError, ErrorMode, pTry } from '@naturalcycles/js-lib'
import { beforeAll, expect, test } from 'vitest'
import type { TransformMapStats } from '../index.js'
import { _pipeline, writableVoid } from '../index.js'
import { transformMapSync } from './transformMapSync.js'

interface Item {
  id: string
}

beforeAll(() => {
  mockTime()
})

test('transformMapSync simple', async () => {
  const data: Item[] = _range(1, 4).map(n => ({ id: String(n) }))
  const readable = Readable.from(data)

  const data2: Item[] = []

  await _pipeline([readable, transformMapSync<Item, void>(r => void data2.push(r)), writableVoid()])

  expect(data2).toEqual(data)
  // expect(readable.destroyed).toBe(true)
})

test('transformMapSync error', async () => {
  let stats: TransformMapStats
  const data = _range(100).map(String)

  const data2: string[] = []
  const [err] = await pTry(
    _pipeline([
      Readable.from(data),
      transformMapSync<string, void>(
        (r, i) => {
          if (i === 50) {
            throw new AppError('error on 50th')
          }

          data2.push(r)
        },
        {
          onDone: s => (stats = s),
        },
      ),
      writableVoid(),
    ]),
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

test('transformMapSync suppressed error', async () => {
  let stats: TransformMapStats
  const data = _range(100).map(String)

  const data2: string[] = []
  await _pipeline([
    Readable.from(data),
    transformMapSync<string, void>(
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
    ),
    writableVoid(),
  ])

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
