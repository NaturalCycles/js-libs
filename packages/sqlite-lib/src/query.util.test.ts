import { createTestItemsDBM, TEST_TABLE } from '@naturalcycles/db-lib/dist/testing/index.js'
import { test } from 'vitest'
import { insertSQL } from './query.util.js'

test('insertSQL', () => {
  const items = createTestItemsDBM(3)
  const sqls = insertSQL(TEST_TABLE, items)
  console.log(sqls)
  // sqls.forEach(s => console.log(s.values))
})
