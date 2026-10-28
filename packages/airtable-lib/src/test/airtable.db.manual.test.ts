import type { CommonDBImplementationQuirks } from '@naturalcycles/db-lib/testing'
import { runCommonDaoTest, runCommonDBTest } from '@naturalcycles/db-lib/testing'
import { loadEnvFileIfExists, requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { describe } from 'vitest'
import { AirtableDB } from '../airtableDB.js'

loadEnvFileIfExists()

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
