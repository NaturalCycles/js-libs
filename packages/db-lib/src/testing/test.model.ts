import { _range } from '@naturalcycles/js-lib/array/range.js'
import type { JsonSchemaObject } from '@naturalcycles/js-lib/json-schema'
import { j } from '@naturalcycles/js-lib/json-schema'
import type { BaseDBEntity, UnixTimestamp } from '@naturalcycles/js-lib/types'
import {
  baseDBEntitySchema,
  binarySchema,
  booleanSchema,
  numberSchema,
  type ObjectSchema,
  objectSchema,
  stringSchema,
} from '@naturalcycles/nodejs-lib/joi'

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

export const testItemBMSchema: ObjectSchema<TestItemBM> = objectSchema<TestItemBM>({
  k1: stringSchema,
  k2: stringSchema.allow(null).optional(),
  k3: numberSchema.optional(),
  even: booleanSchema.optional(),
  b1: binarySchema.optional(),
  nested: objectSchema({
    foo: numberSchema,
  }).optional(),
}).concat(baseDBEntitySchema as any)

export const testItemTMSchema: ObjectSchema<TestItemTM> = objectSchema<TestItemTM>({
  k1: stringSchema,
  even: booleanSchema.optional(),
})

export const testItemBMJsonSchema: JsonSchemaObject<TestItemBM> = j
  .rootObject<TestItemBM>({
    // todo: figure out how to not copy-paste these 3 fields
    id: j.string(), // todo: not strictly needed here
    created: j.unixTimestamp(),
    updated: j.unixTimestamp(),
    k1: j.string(),
    k2: j.oneOf<string | null>([j.string(), j.null()]).optional(),
    k3: j.number().optional(),
    even: j.boolean().optional(),
    b1: j.buffer().optional(),
  })
  .baseDBEntity()
  .build()

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
