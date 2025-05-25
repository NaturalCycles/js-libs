import { AppError } from '@naturalcycles/js-lib'
import { expect, test } from 'vitest'
import { AirtableErrorCode } from './airtable.model.js'
import { AirtableLib } from './airtableLib.js'
import { mockTableDao1 } from './test/airtable.mock.js'

test('wrong apiKey should throw', async () => {
  const airtableLib = new AirtableLib({
    apiKey: 'apiKey123',
  })
  const tableDao = mockTableDao1(await airtableLib.api(), 'someBaseId')

  // await expect(airtableService.getRecords('someBaseId.someTable')).rejects.toThrow(AppError)
  const err = await tableDao.getRecords().catch(err2 => err2)
  expect(err).toBeInstanceOf(AppError)
  expect(err).toMatchObject({
    message: expect.any(String),
    stack: expect.any(String),
    data: {
      code: AirtableErrorCode.AIRTABLE_ERROR,
    },
  })
})

test('api', async () => {
  const airtableLib = new AirtableLib({
    apiKey: 'apiKey123',
  })

  const api = await airtableLib.api()
  // console.log(api)
  expect(api).toBeDefined()
  expect(api.base).toBeDefined()
  expect(typeof api.base).toBe('function')
})
