import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { expect, it } from 'vitest'
import { MongoDB } from './mongo.db.js'

it('test1', async () => {
  const mongo = new MongoDB({
    uri: 'abc',
    db: TEST_TABLE,
  })
  await expect(mongo.client()).rejects.toThrow('Invalid scheme')
})
