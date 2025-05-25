import { fs2 } from '@naturalcycles/nodejs-lib'
import type {
  AirtableBaseDaoCfg,
  AirtableConnector,
  AirtableDaoOptions,
} from '../airtable.model.js'

export const AIRTABLE_CONNECTOR_JSON = Symbol('AIRTABLE_CONNECTOR_JSON')

export interface AirtableJsonConnectorCfg {
  /**
   * Directory where json cache is stored.
   * Will be stored as `${cacheDir}/${baseName}.json`
   */
  cacheDir: string
}

export class AirtableJsonConnector<BASE = any> implements AirtableConnector<BASE> {
  constructor(private cfg: AirtableJsonConnectorCfg) {}

  readonly TYPE = AIRTABLE_CONNECTOR_JSON

  async fetch(baseDaoCfg: AirtableBaseDaoCfg<BASE>, _opt: AirtableDaoOptions = {}): Promise<BASE> {
    // require ensures the read operation is cached
    // return require(this.jsonPath)
    // NO: going in favor of async interface for all connectors

    return await fs2.readJsonAsync(`${this.cfg.cacheDir}/${baseDaoCfg.baseName}.json`)
  }

  async upload(base: BASE, baseDaoCfg: AirtableBaseDaoCfg<BASE>): Promise<void> {
    const jsonPath = `${this.cfg.cacheDir}/${baseDaoCfg.baseName}.json`
    await fs2.outputJsonAsync(jsonPath, base, { spaces: 2 })
  }
}
