import { _range } from '@naturalcycles/js-lib/array/range.js'
import { AppError, ErrorMode, pTry } from '@naturalcycles/js-lib/error'
import { expect, test } from 'vitest'
import { Pipeline } from '../pipeline.js'

test('transformMapSimple', async () => {
  const data = _range(1, 4).map(String)
  const data2: string[] = []

  await Pipeline.fromArray(data)
    .mapSimple(r => void data2.push(r))
    .run()

  expect(data2).toEqual(data)
})

test('transformMapSimple error', async () => {
  const data = _range(100).map(String)

  const data2: string[] = []
  const [err] = await pTry(
    Pipeline.fromArray(data)
      .mapSimple((r, i) => {
        if (i === 50) {
          throw new AppError('error on 50th')
        }

        data2.push(r)
      })
      .run(),
  )

  expect(err).toBeInstanceOf(AppError)
  expect(err).toMatchInlineSnapshot(`[AppError: error on 50th]`)

  expect(data2).toEqual(data.slice(0, 50))
})

test('transformMapSimple suppressed error', async () => {
  const data = _range(100).map(String)
  const data2: string[] = []
  await Pipeline.fromArray(data)
    .mapSimple(
      (r, i) => {
        if (i === 50) {
          throw new AppError('error on 50th')
        }

        data2.push(r)
      },
      {
        errorMode: ErrorMode.SUPPRESS,
      },
    )
    .run()

  expect(data2).toEqual(data.filter(r => r !== '50'))
})
