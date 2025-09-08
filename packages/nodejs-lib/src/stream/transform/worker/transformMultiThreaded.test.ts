import { _range } from '@naturalcycles/js-lib/array/range.js'
import { expect, test } from 'vitest'
import { testDir } from '../../../test/paths.cnst.js'
import { Pipeline } from '../../index.js'
import { transformMultiThreaded } from './transformMultiThreaded.js'

test('transformMultiThreaded', async () => {
  const items = _range(1, 12).map(i => ({ id: i }))

  const workerFile = `${testDir}/testWorker.ts`

  const items2 = await Pipeline.fromArray(items)
    .transform<any>(
      transformMultiThreaded({
        workerFile,
        poolSize: 4,
        workerData: { hello: 'lalala', logEvery: 2 },
      }),
    )
    .toArray()

  // console.log(items2)
  expect(items2.sort((a, b) => (a.id < b.id ? -1 : 1))).toEqual(items.filter(i => i.id <= 10))
}, 10_000)
