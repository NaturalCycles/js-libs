import {
  anySchema,
  arraySchema,
  booleanSchema,
  integerSchema,
  Joi,
  type ObjectSchema,
  objectSchema,
  type StringSchema,
  stringSchema,
} from '@naturalcycles/nodejs-lib/joi'
import type { CommonDBOptions, CommonDBSaveOptions } from '../db.model.js'
import type {
  DBQuery,
  DBQueryFilter,
  DBQueryFilterOperator,
  DBQueryOrder,
} from '../query/dbQuery.js'
import { dbQueryFilterOperatorValues } from '../query/dbQuery.js'

export const commonDBOptionsSchema: ObjectSchema<CommonDBOptions> = objectSchema<CommonDBOptions>({
  ['onlyCache' as any]: booleanSchema.optional(),
  ['skipCache' as any]: booleanSchema.optional(),
})

export const commonDBSaveOptionsSchema: ObjectSchema<CommonDBSaveOptions<any>> = objectSchema<
  CommonDBSaveOptions<any>
>({
  excludeFromIndexes: arraySchema(stringSchema).optional(),
}).concat(commonDBOptionsSchema)

export const dbQueryFilterOperatorSchema: StringSchema<DBQueryFilterOperator> =
  Joi.string<DBQueryFilterOperator>().valid(...dbQueryFilterOperatorValues)

export const dbQueryFilterSchema: ObjectSchema<DBQueryFilter<any>> = objectSchema<
  DBQueryFilter<any>
>({
  name: stringSchema,
  op: dbQueryFilterOperatorSchema,
  val: anySchema,
})

export const dbQueryOrderSchema: ObjectSchema<DBQueryOrder<any>> = objectSchema<DBQueryOrder<any>>({
  name: stringSchema,
  descending: booleanSchema.optional(),
})

export const dbQuerySchema: ObjectSchema<DBQuery<any>> = objectSchema<DBQuery<any>>({
  table: stringSchema,
  _filters: arraySchema(dbQueryFilterSchema).optional(),
  _limitValue: integerSchema.min(0).optional(),
  _offsetValue: integerSchema.min(0).optional(),
  _orders: arraySchema(dbQueryOrderSchema).optional(),
  _startCursor: stringSchema.optional(),
  _endCursor: stringSchema.optional(),
  _selectedFieldNames: arraySchema(stringSchema).optional(),
})
