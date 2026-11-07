import { _Memo } from '@naturalcycles/js-lib/decorators/memo.decorator.js'
import type { AirtableApi } from './airtable.api.js'
import { createAirtableApi } from './airtable.api.js'
import type { AirtableLibCfg } from './airtable.model.js'

export class AirtableLib {
  constructor(public airtableServiceCfg: AirtableLibCfg) {}

  @_Memo()
  api(): AirtableApi {
    return createAirtableApi({
      apiKey: this.airtableServiceCfg.apiKey,
      requestTimeout: 40_000,
    })
  }
}
