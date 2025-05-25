import { Readable, Transform } from 'stream'
import { AggregatedError, AsyncMapper, ErrorMode, _range, pDelay } from '@naturalcycles/js-lib'
import { readableFromArray, _pipeline, writableVoid, _pipelineToArray } from '../..'
import { transformMap } from './transformMap'

interface Item {
  id: string
}

// Mapper that throws 'my error' on third id
const mapperError3: AsyncMapper<Item, Item> = (item, _i) => {
  if (item.id === '3') throw new Error('my error')
  return item
}

test('transformMap simple', async () => {
  const data: Item[] = _range(1, 4).map(n => ({ id: String(n) }))
  const readable = Readable.from(data)

  const data2: Item[] = []

  await _pipeline([readable, transformMap<Item, void>(r => void data2.push(r))])

  expect(data2).toEqual(data)
  // expect(readable.destroyed).toBe(true)
})

test('transformMap with mapping', async () => {
  const data: Item[] = _range(1, 4).map(n => ({ id: String(n) }))
  const data2 = await _pipelineToArray<Item>([
    readableFromArray(data),
    transformMap(r => ({
      id: r.id + '!',
    })),
  ])

  expect(data2).toEqual(data.map(r => ({ id: r.id + '!' })))
})

test('transformMap emit array as multiple items', async () => {
  const data = _range(1, 4)
  const data2 = await _pipelineToArray<number>([
    readableFromArray(data),
    transformMap(n => [n * 2, n * 2 + 1], { flattenArrayOutput: true }),
  ])

  const expected: number[] = []
  data.forEach(n => {
    expected.push(n * 2, n * 2 + 1)
  })

  // console.log(data2)

  expect(data2).toEqual(expected)
})

// non-object mode is not supported anymore
// test('transformMap objectMode=false', async () => {
//   const data: string[] = _range(1, 4).map(n => String(n))
//   const readable = Readable.from(data)
//
//   const data2: string[] = []
//
//   await _pipeline([
//     readable,
//     transformMap<Buffer, void>(r => void data2.push(String(r)), { objectMode: false }),
//   ])
//
//   expect(data2).toEqual(data)
// })

test('transformMap errorMode=THROW_IMMEDIATELY', async () => {
  const data: Item[] = _range(1, 5).map(n => ({ id: String(n) }))
  const readable = readableFromArray(data)
  const data2: Item[] = []

  await expect(
    _pipeline([
      readable,
      transformMap(mapperError3, { concurrency: 1 }),
      transformMap<Item, void>(r => void data2.push(r)),
    ]),
  ).rejects.toThrow('my error')

  expect(data2).toEqual(data.filter(r => Number(r.id) < 3))

  // expect(readable.destroyed).toBe(true)
})

test('transformMap errorMode=THROW_AGGREGATED', async () => {
  const data: Item[] = _range(1, 5).map(n => ({ id: String(n) }))
  const readable = readableFromArray(data)
  const data2: Item[] = []

  await expect(
    _pipeline([
      readable,
      transformMap(mapperError3, { errorMode: ErrorMode.THROW_AGGREGATED }),
      transformMap<Item, void>(r => void data2.push(r)),
    ]),
  ).rejects.toThrow(AggregatedError)

  expect(data2).toEqual(data.filter(r => r.id !== '3'))

  // expect(readable.destroyed).toBe(true)
})

test('transformMap errorMode=SUPPRESS', async () => {
  const data: Item[] = _range(1, 5).map(n => ({ id: String(n) }))
  const readable = readableFromArray(data)

  const data2: Item[] = []
  await _pipeline([
    readable,
    transformMap(mapperError3, { errorMode: ErrorMode.SUPPRESS }),
    transformMap<Item, void>(r => void data2.push(r)),
  ])

  expect(data2).toEqual(data.filter(r => r.id !== '3'))

  // expect(readable.destroyed).toBe(true)
})

class MyReadable extends Readable {
  private n = 0

  override async _read() {
    // console.log(`_read ${size}`)
    await pDelay(10)

    this.push(++this.n)

    if (this.n >= 50) this.push(null) // done
  }
}

test('transformMap concurrency', async () => {
  const readable = new MyReadable({
    objectMode: true,
  })

  await _pipeline([
    readable,
    transformMap(
      async n => {
        // wait and return doubled number
        // console.log('mapper started')
        await pDelay(100, n * 2)
        // console.log('mapper done')
        return n * 2
      },
      {
        concurrency: 16,
      },
    ),
    new Transform({
      objectMode: true,
      transform(r: any, _enc, cb) {
        // console.log('t2', r)
        cb()
      },
    }),
    writableVoid(),
  ])
})
