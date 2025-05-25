import { _range } from '@naturalcycles/js-lib'
import { readableFromArray, writablePushToArray, _pipeline } from '../..'
import { transformToCSV } from './transformToCSV'

test('transformToCSV', async () => {
  const items = _range(1, 11).map(n => ({
    id: `id${n}`,
    num: n,
    even: n % 2 === 0,
  }))

  const rows: string[] = []

  await _pipeline([readableFromArray(items), transformToCSV(), writablePushToArray(rows)])

  const str = rows.join('')
  // console.log(str)
  expect(str).toMatchSnapshot()
})
