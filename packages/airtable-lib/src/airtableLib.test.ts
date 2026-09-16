import { expect, test } from 'vitest'
import { AirtableLib } from './airtableLib.js'

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
