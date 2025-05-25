import { TEST_TABLE } from '@naturalcycles/db-lib/dist/testing/index.js'
import { expect, test } from 'vitest'
import { MongoDB } from './mongo.db.js'

test('test1', async () => {
  const mongo = new MongoDB({
    uri: 'abc',
    db: TEST_TABLE,
  })
  await expect(mongo.client()).rejects.toThrow('Invalid scheme')
})
