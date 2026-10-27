import Airtable from 'airtable'
import { expect, it } from 'vitest'
import { AirtableLib } from './airtableLib.js'

it('should configure the Airtable library with the API key and a 40 s request timeout', async () => {
  const airtableLib = new AirtableLib({
    apiKey: 'apiKey123',
  })

  const api = await airtableLib.api()

  expect(api).toBe(Airtable)
  expect(Airtable.apiKey).toBe('apiKey123')
  expect(Airtable.requestTimeout).toBe(40_000)
})
