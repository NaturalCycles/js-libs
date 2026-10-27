import { expect, it } from 'vitest'
import { InMemoryDB } from '../inmemory/inMemory.db.js'
import { createTestTimeSeries } from '../testing/timeSeriesTest.util.js'
import { CommonTimeSeriesDao } from './commonTimeSeriesDao.js'

const db = new InMemoryDB({
  // persistenceEnabled: true,
  // persistZip: false,
})

const tsDao = new CommonTimeSeriesDao({
  db,
})

it('should return the saved points of a series in ascending time order', async () => {
  const points = createTestTimeSeries()
  await tsDao.saveBatch('lala', points)

  const r = await tsDao.query({ series: 'lala' })
  expect(r).toEqual(points.toReversed())

  // await db.flushToDisk()
})
