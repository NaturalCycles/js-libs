import { createTestItemsDBM, TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { it } from 'vitest'
import { insertSQL } from './query.util.js'

it('insertSQL', () => {
  const items = createTestItemsDBM(3)
  const sqls = insertSQL(TEST_TABLE, items)
  console.log(sqls)
  // sqls.forEach(s => console.log(s.values))
})
