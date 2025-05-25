import { _range } from '@naturalcycles/js-lib'
import { csvParse } from './csvParse'
import { csvStringify } from './csvStringify'

test('csv', async () => {
  const items = _range(1, 11).map(n => ({
    id: `id${n}`,
    num: n,
    even: n % 2 === 0,
  }))

  const str = csvStringify(items)
  // console.log(str)

  const items2 = csvParse(str, {
    cast: true,
  })
  // console.log(items2)

  expect(
    items2.map(i => ({
      // todo: make csvParse cast booleans automatically
      ...i,
      even: Boolean(i.even),
    })),
  ).toEqual(items)
})
