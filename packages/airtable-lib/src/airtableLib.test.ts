import { expect, it } from 'vitest'
import { AirtableLib } from './airtableLib.js'

it('should return an Airtable API with a base factory', async () => {
  const airtableLib = new AirtableLib({
    apiKey: 'apiKey123',
  })

  const api = await airtableLib.api()
  // console.log(api)
  expect(api).toBeDefined()
  expect(api.base).toBeDefined()
  expect(typeof api.base).toBe('function')
})
