import { _Memo } from '@naturalcycles/js-lib'
import type { AirtableApi } from './airtable.api.js'
import type { AirtableLibCfg } from './airtable.model.js'

export class AirtableLib {
  constructor(public airtableServiceCfg: AirtableLibCfg) {}

  @_Memo()
  async api(): Promise<AirtableApi> {
    // lazy-loading the library
    const airtableApi = (await import('airtable')).default as any as AirtableApi

    const { apiKey } = this.airtableServiceCfg

    airtableApi.configure({
      // endpointURL: 'https://api.airtable.com',
      apiKey,
      // Default is 5 minutes, we override the default to 40 seconds
      requestTimeout: 40_000,
    })
    return airtableApi
  }
}
