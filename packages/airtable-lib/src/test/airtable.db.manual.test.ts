import 'dotenv/config'
import type { CommonDBImplementationQuirks } from '@naturalcycles/db-lib/dist/testing/index.js'
import { runCommonDaoTest, runCommonDBTest } from '@naturalcycles/db-lib/dist/testing/index.js'
import { requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { describe, test } from 'vitest'
import { AirtableDB } from '../airtableDB.js'

const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = requireEnvKeys(
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
)

const db = new AirtableDB({
  apiKey: AIRTABLE_API_KEY,
  baseId: AIRTABLE_BASE_ID,
})
await db.ping()

const quirks: CommonDBImplementationQuirks = {
  allowExtraPropertiesInResponse: true,
  allowBooleansAsUndefined: true,
}

describe('runCommonDBTest', async () => {
  await runCommonDBTest(db, quirks)
})

describe('runCommonDaoTest', async () => {
  await runCommonDaoTest(db, quirks)
})

test.skip('manual1', async () => {
  delete db.cfg.baseId

  await db.saveBatch<any>(`appT51quIWm4RiMpc.Translations`, [
    {
      id: 'push-startTesting-title2',
      'en-US': 'sdf3',
    },
  ])
})
