import { MOCK_TS_2018_06_21 } from '@naturalcycles/dev-lib/testing/time'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AirtableLib } from './airtableLib.js'
import { AIRTABLE_CONNECTOR_JSON } from './connector/airtableJsonConnector.js'
import { mockBaseDao } from './test/airtable.mock.js'

beforeEach(() => {
  vi.setSystemTime(MOCK_TS_2018_06_21 * 1000)
})

afterEach(() => {
  vi.useRealTimers()
})

const airtableLib = new AirtableLib({
  apiKey: 'fakekey',
})

it('should lazy-load the cache without setting lastChanged', async () => {
  const baseDao = mockBaseDao(airtableLib, 'baseId')

  expect(baseDao.lastChanged).toBeUndefined()
  expect(baseDao.lastFetchedMap.get(AIRTABLE_CONNECTOR_JSON)).toBeUndefined()

  const cache = await baseDao.getCache()
  // console.log(cache)

  expect(cache).toMatchSnapshot()

  expect(baseDao.lastChanged).toBeUndefined() // accessing the cache and lazy-loading it is not considered as "changed"
})

it('should notify cache listeners only when the cache content changes', async () => {
  const baseDao = mockBaseDao(airtableLib, 'baseId')

  let updatedTimes = 0
  baseDao.cacheUpdatedListeners.push(() => updatedTimes++)

  expect(updatedTimes).toBe(0)

  await baseDao.getCache() // should trigger cacheUpdated$
  expect(updatedTimes).toBe(1)

  await baseDao.getCache() // should NOT trigger cacheUpdated$
  expect(updatedTimes).toBe(1)

  const fakeCache: any = { table1: [{ airtableId: 'asd' }] }
  baseDao.setCache(fakeCache) // trigger
  expect(updatedTimes).toBe(2)
  expect(baseDao.lastChanged).toBe(MOCK_TS_2018_06_21)

  baseDao.setCache(fakeCache) // NOT trigger (data is the same)
  expect(updatedTimes).toBe(2)

  baseDao.setCache(undefined) // trigger
  expect(updatedTimes).toBe(3)
})

// todo: getById should lazyLoad
// todo: getTableRecords should lazyLoad
