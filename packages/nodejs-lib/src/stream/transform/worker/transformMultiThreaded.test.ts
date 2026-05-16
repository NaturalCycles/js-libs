import { _range } from '@naturalcycles/js-lib/array/range.js'
import { comparators } from '@naturalcycles/js-lib/array/sort.js'
import { expect, test } from 'vitest'
import { testDir } from '../../../test/paths.cnst.js'
import { Pipeline } from '../../index.js'
import { transformMultiThreaded } from './transformMultiThreaded.js'

test('transformMultiThreaded', async () => {
  const items = _range(1, 12).map(i => ({ id: i }))

  const silent = !!process.env['TEST_SILENT'] || true
  const workerFile = `${testDir}/testWorker.ts`

  const items2 = await Pipeline.fromArray(items)
    .transform<any>(
      transformMultiThreaded({
        workerFile,
        poolSize: 4,
        workerData: { hello: 'lalala', logEvery: 2, silent },
      }),
    )
    .toArray()

  // console.log(items2)
  expect(items2.sort(comparators.by(r => r.id))).toEqual(items.filter(i => i.id <= 10))
}, 10_000)
