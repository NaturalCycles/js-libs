import { AppError, HttpRequestError } from '@naturalcycles/js-lib/error/error.util.js'
import { Fetcher } from '@naturalcycles/js-lib/http'
import { afterEach, expect, it, vi } from 'vitest'
import { createAirtableApi } from './airtable.api.js'
import { AirtableErrorCode } from './airtable.model.js'
import { AirtableLib } from './airtableLib.js'
import { mockTableDao1 } from './test/airtable.mock.js'

afterEach(() => {
  vi.useRealTimers()
})

const api = createAirtableApi({ apiKey: 'key1' })

it('should list all pages of records via POST listRecords, passing the offset', async () => {
  mockResponses(
    Response.json({ records: [record('rec1')], offset: 'itr1' }),
    Response.json({ records: [record('rec2')] }),
  )

  const records = await api.base('app1')('table1').select({ view: 'Grid view', pageSize: 1 }).all()

  expect(records.map(r => r.id)).toEqual(['rec1', 'rec2'])
  expect(requests()).toEqual([
    {
      method: 'POST',
      url: 'https://api.airtable.com/v0/app1/table1/listRecords',
      body: { view: 'Grid view', pageSize: 1 },
    },
    {
      method: 'POST',
      url: 'https://api.airtable.com/v0/app1/table1/listRecords',
      body: { view: 'Grid view', pageSize: 1, offset: 'itr1' },
    },
  ])
})

it('should send the api key as a bearer token', async () => {
  mockResponses(Response.json(record('rec1')))

  await api.base('app1')('table1').find('rec1')

  const [, init] = vi.mocked(Fetcher.callNativeFetch).mock.calls[0]!
  expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer key1')
})

it('should url-encode the table name', async () => {
  mockResponses(Response.json(record('rec1')))

  await api.base('app1')('My table/2').find('rec1')

  expect(requests()[0]!.url).toBe('https://api.airtable.com/v0/app1/My%20table%2F2/rec1')
})

it('should send the record fields when creating, updating, replacing and deleting', async () => {
  mockResponses(
    Response.json(record('rec1')),
    Response.json(record('rec1')),
    Response.json(record('rec1')),
    Response.json({ id: 'rec1', deleted: true }),
  )
  const table = api.base('app1')('table1')

  await table.create({ name: 'a' })
  await table.update('rec1', { name: 'b' })
  await table.replace('rec1', { name: 'c' })
  const deleted = await table.destroy('rec1')

  expect(deleted).toEqual({ id: 'rec1', deleted: true })
  expect(requests()).toEqual([
    {
      method: 'POST',
      url: 'https://api.airtable.com/v0/app1/table1',
      body: { fields: { name: 'a' } },
    },
    {
      method: 'PATCH',
      url: 'https://api.airtable.com/v0/app1/table1/rec1',
      body: { fields: { name: 'b' } },
    },
    {
      method: 'PUT',
      url: 'https://api.airtable.com/v0/app1/table1/rec1',
      body: { fields: { name: 'c' } },
    },
    {
      method: 'DELETE',
      url: 'https://api.airtable.com/v0/app1/table1/rec1',
      body: undefined,
    },
  ])
})

it('should retry a create that Airtable rejected with 429', async () => {
  vi.useFakeTimers()
  mockResponses(rateLimitedResponse(), Response.json(record('rec1')))

  const created = api.base('app1')('table1').create({ name: 'a' })
  await vi.advanceTimersByTimeAsync(6000)

  expect((await created).id).toBe('rec1')
  expect(Fetcher.callNativeFetch).toHaveBeenCalledTimes(2)
})

it('should not retry a create that failed with a 500, as it may have been saved', async () => {
  mockResponses(Response.json({ error: 'SERVER_ERROR' }, { status: 500 }))

  await expect(api.base('app1')('table1').create({ name: 'a' })).rejects.toThrow(HttpRequestError)
  expect(Fetcher.callNativeFetch).toHaveBeenCalledTimes(1)
})

it('should retry listing records that failed with a 500', async () => {
  vi.useFakeTimers()
  mockResponses(
    Response.json({ error: 'SERVER_ERROR' }, { status: 500 }),
    Response.json({ records: [record('rec1')] }),
  )

  const records = api.base('app1')('table1').select().all()
  await vi.advanceTimersByTimeAsync(6000)

  expect(await records).toHaveLength(1)
  expect(Fetcher.callNativeFetch).toHaveBeenCalledTimes(2)
})

it('should return undefined from the table dao when the record is not found', async () => {
  mockResponses(Response.json({ error: 'NOT_FOUND' }, { status: 404 }))
  const tableDao = mockTableDao1(new AirtableLib({ apiKey: 'key1' }), 'app1')

  expect(await tableDao.getRecord('rec1')).toBeUndefined()
})

it('should wrap other errors into an AppError with the AIRTABLE_ERROR code', async () => {
  mockResponses(
    Response.json(
      { error: { type: 'INVALID_VALUE_FOR_COLUMN', message: 'Field "name" cannot accept 1' } },
      { status: 422 },
    ),
  )
  const tableDao = mockTableDao1(new AirtableLib({ apiKey: 'key1' }), 'app1')

  const err = await tableDao.updateRecord('rec1', { name: 1 as any }).catch(err => err)

  expect(err).toBeInstanceOf(AppError)
  expect(err.data).toMatchObject({
    code: AirtableErrorCode.AIRTABLE_ERROR,
    airtableTableName: 'table1',
  })
  expect(err.message).toContain('table1: ')
  expect(err.cause.name).toBe('HttpRequestError')
})

function record(id: string): AnyRecord {
  return { id, createdTime: '2026-01-01T00:00:00.000Z', fields: { name: id } }
}

function rateLimitedResponse(): Response {
  return Response.json(
    { errors: [{ error: 'RATE_LIMIT_REACHED', message: 'Rate limit exceeded.' }] },
    { status: 429 },
  )
}

function mockResponses(...responses: Response[]): void {
  const queue = responses.slice()
  vi.spyOn(Fetcher, 'callNativeFetch').mockImplementation(async () => queue.shift()!)
}

function requests(): { method?: string; url: string; body: unknown }[] {
  return vi.mocked(Fetcher.callNativeFetch).mock.calls.map(([url, init]) => ({
    method: init.method,
    url,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  }))
}

interface AnyRecord {
  id: string
  createdTime: string
  fields: { name: string }
}
