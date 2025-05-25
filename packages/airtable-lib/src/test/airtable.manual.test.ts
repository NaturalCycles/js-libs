import 'dotenv/config'
import { _omit } from '@naturalcycles/js-lib'
import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { expect, test } from 'vitest'
import { AirtableDB } from '../airtableDB.js'
import { AirtableLib } from '../airtableLib.js'
import { AIRTABLE_CONNECTOR_JSON, AIRTABLE_CONNECTOR_REMOTE } from '../index.js'
import {
  mockBaseDao,
  mockBasesDao,
  mockTable1,
  mockTable2,
  mockTableDao1,
  mockTableDao2,
} from './airtable.mock.js'

const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = requireEnvKeys(
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
)

const airtableLib = new AirtableLib({
  apiKey: AIRTABLE_API_KEY,
})

test('getByIds', async () => {
  const db = new AirtableDB({
    apiKey: AIRTABLE_API_KEY,
    baseId: AIRTABLE_BASE_ID,
    // tableCfgMap: {},
    noAttachmentQueryString: true,
  })

  const r = await db.getByIds('users', ['user1', 'user4'])
  console.log(r)
})

test('delete, create, update, get', async () => {
  const records = mockTable1()
  const rec1 = records[0]!

  const tableDao = mockTableDao1(await airtableLib.api(), AIRTABLE_BASE_ID)

  const deleteResult = await tableDao.deleteRecord('nonExistingId')
  expect(deleteResult).toBe(false)

  await tableDao.deleteAllRecords()

  const rec1Created = await tableDao.createRecord(rec1)
  console.log({ rec1Created })
  expect(rec1Created).toHaveProperty('airtableId', expect.any(String))
  expect(rec1Created).toMatchObject(rec1)

  expect(await tableDao.getRecord(rec1Created.airtableId)).toEqual(rec1Created)

  expect(await tableDao.deleteRecord(rec1Created.airtableId)).toBe(true)

  expect(await tableDao.getRecord(rec1Created.airtableId)).toBeUndefined()

  const recordsCreated = await tableDao.createRecords(records)
  // console.log({recordsCreated})
  recordsCreated.forEach(record => expect(record).toHaveProperty('airtableId', expect.any(String)))
  const recordsWithoutAirtableId = recordsCreated.map(r => _omit(r, ['airtableId']))
  expect(recordsWithoutAirtableId).toEqual(records)

  const recordsLoaded = await tableDao.getRecords()
  // console.log({recordsLoaded})
  expect(recordsLoaded).toEqual(recordsCreated)
})

test('getById', async () => {
  const tableDao = mockTableDao1(await airtableLib.api(), AIRTABLE_BASE_ID)

  // const v = await tableDao.getRecordById('name_1', {idField: 'name'})
  const v = await tableDao.getByIds(['name_1', 'name_2'], { idField: 'name' })

  console.log(v)
})

test('integration: table1, table2', async () => {
  const mocks1 = mockTable1()
  const mocks2 = mockTable2()

  const tableDao1 = mockTableDao1(await airtableLib.api(), AIRTABLE_BASE_ID)
  const tableDao2 = mockTableDao2(await airtableLib.api(), AIRTABLE_BASE_ID)

  await tableDao1.deleteAllRecords()
  await tableDao2.deleteAllRecords()

  const _records1 = await tableDao1.createRecords(mocks1)
  const _records2 = await tableDao2.createRecords(mocks2)
})

test('fetchRemoteBase', async () => {
  const baseDao = mockBaseDao(await airtableLib.api(), AIRTABLE_BASE_ID)
  const base = await baseDao.fetch(AIRTABLE_CONNECTOR_REMOTE)
  console.log(JSON.stringify(base, null, 2))
})

test('fetchRemoteBasesToJson', async () => {
  const basesDao = mockBasesDao(await airtableLib.api(), AIRTABLE_BASE_ID)
  await basesDao.fetchAll(AIRTABLE_CONNECTOR_REMOTE)
  await basesDao.uploadAll(AIRTABLE_CONNECTOR_JSON)

  await basesDao.fetchAll(AIRTABLE_CONNECTOR_JSON)
  const baseMap = basesDao.getCacheMap()
  console.log(JSON.stringify(baseMap, null, 2))
})

test('uploadJsonToRemoteBases', async () => {
  const basesDao = mockBasesDao(await airtableLib.api(), AIRTABLE_BASE_ID)
  await basesDao.fetchAll(AIRTABLE_CONNECTOR_JSON)
  await basesDao.uploadAll(AIRTABLE_CONNECTOR_REMOTE, { deleteAllOnUpload: false, upsert: true })
}, 120000)

test('getAirtableCacheFromJson', async () => {
  const baseDao = mockBaseDao(await airtableLib.api(), AIRTABLE_BASE_ID)
  await baseDao.fetch(AIRTABLE_CONNECTOR_JSON)

  // console.log(cache.getBase())
  console.log(await baseDao.getTableRecords('categories'))
  console.log(await baseDao.getByAirtableId('recKD4dQ5UVWxBFhT'))
  console.log(await baseDao.getByAirtableIds(['recKD4dQ5UVWxBFhT', 'recL8ZPFiCjTivovL']))

  expect(await baseDao.getById('categories', 'category1')).toMatchObject({
    id: 'category1',
  })
})
