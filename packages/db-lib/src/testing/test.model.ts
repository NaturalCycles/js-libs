import { _range } from '@naturalcycles/js-lib/array/range.js'
import type { BaseDBEntity, UnixTimestamp } from '@naturalcycles/js-lib/types'
import { j } from '@naturalcycles/nodejs-lib/ajv'
import type { JsonSchemaObjectBuilder } from '@naturalcycles/nodejs-lib/ajv'

const MOCK_TS_2018_06_21 = 1529539200 as UnixTimestamp

export const TEST_TABLE = 'TEST_TABLE'
export const TEST_TABLE_2 = 'TEST_TABLE_2'

export interface TestItemBM extends BaseDBEntity {
  k1: string
  k2?: string | null
  k3?: number
  even?: boolean
  b1?: Buffer
  nested?: {
    foo: number
  }
}

export interface TestItemDBM extends TestItemBM {}

export interface TestItemTM {
  k1: string
  even?: boolean
}

export const testItemTMSchema = j.object<TestItemTM>({
  k1: j.string(),
  even: j.boolean().optional(),
})

export const testItemBMSchema: JsonSchemaObjectBuilder<TestItemBM, TestItemBM, false> =
  j.object.dbEntity<TestItemBM>({
    // todo: figure out how to not copy-paste these 3 fields
    id: j.string(), // todo: not strictly needed here
    created: j.number().integer().unixTimestamp(),
    updated: j.number().integer().unixTimestamp(),
    k1: j.string(),
    k2: j.string().nullable().optional(),
    k3: j.number().optional(),
    even: j.boolean().optional(),
    b1: j.buffer().optional(),
    nested: j.object.infer({ foo: j.number() }).optional(),
  })

export function createTestItemDBM(num = 1): TestItemDBM {
  return {
    id: `id${num}`,
    k1: `v${num}`,
    k2: `v${num * 2}`,
    k3: num,
    even: num % 2 === 0,
    nested: { foo: num },
    created: MOCK_TS_2018_06_21,
    updated: MOCK_TS_2018_06_21,
  }
}

export function createTestItemBM(num = 1): TestItemBM {
  return createTestItemDBM(num)
}

export function createTestItemsDBM(count = 1): TestItemDBM[] {
  return _range(1, count + 1).map(num => createTestItemDBM(num))
}

export function createTestItemsBM(count = 1): TestItemBM[] {
  return _range(1, count + 1).map(num => createTestItemBM(num))
}
