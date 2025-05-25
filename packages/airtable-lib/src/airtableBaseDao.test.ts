import { MOCK_TS_2018_06_21, mockTime } from '@naturalcycles/dev-lib/dist/testing/time.js'
import { beforeEach, expect, test } from 'vitest'
import { AirtableLib } from './airtableLib.js'
import { AIRTABLE_CONNECTOR_JSON } from './connector/airtableJsonConnector.js'
import { mockBaseDao } from './test/airtable.mock.js'

beforeEach(() => {
  mockTime()
})

const airtableLib = new AirtableLib({
  apiKey: 'fakekey',
})

test('getCache', async () => {
  const baseDao = mockBaseDao(await airtableLib.api(), 'baseId')

  expect(baseDao.lastChanged).toBeUndefined()
  expect(baseDao.lastFetchedMap.get(AIRTABLE_CONNECTOR_JSON)).toBeUndefined()

  const cache = await baseDao.getCache()
  // console.log(cache)

  expect(cache).toMatchSnapshot()

  expect(baseDao.lastChanged).toBeUndefined() // accessing the cache and lazy-loading it is not considered as "changed"
})

test('cacheUpdated$', async () => {
  const baseDao = mockBaseDao(await airtableLib.api(), 'baseId')

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
