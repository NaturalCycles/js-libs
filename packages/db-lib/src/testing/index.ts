import { runCommonDaoTest } from './commonDaoTest.js'
import type { CommonDBImplementationQuirks } from './commonDBTest.js'
import { runCommonDBTest } from './commonDBTest.js'
import { runCommonKeyValueDaoTest } from './keyValueDaoTest.js'
import { runCommonKeyValueDBTest } from './keyValueDBTest.js'
import type { TestItemBM, TestItemDBM, TestItemTM } from './test.model.js'
import {
  createTestItemBM,
  createTestItemDBM,
  createTestItemsBM,
  createTestItemsDBM,
  TEST_TABLE,
  testItemBMSchema,
  testItemTMSchema,
} from './test.model.js'

export type { CommonDBImplementationQuirks, TestItemBM, TestItemDBM, TestItemTM }

export {
  createTestItemBM,
  createTestItemDBM,
  createTestItemsBM,
  createTestItemsDBM,
  runCommonDaoTest,
  runCommonDBTest,
  runCommonKeyValueDaoTest,
  runCommonKeyValueDBTest,
  TEST_TABLE,
  testItemBMSchema,
  testItemTMSchema,
}
