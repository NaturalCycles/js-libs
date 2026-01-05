import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import {
  j,
  JsonSchemaAnyBuilder,
  type JsonSchemaObjectBuilder,
} from '@naturalcycles/nodejs-lib/ajv'
import type { CommonDBOptions, CommonDBSaveOptions, DBTransaction } from '../db.model.js'
import {
  type DBQueryFilter,
  dbQueryFilterOperatorValues,
  type DBQueryOrder,
} from '../query/dbQuery.js'

// oxlint-disable typescript/explicit-function-return-type

// DBTransaction schema - validates presence without deep validation
const dbTransactionSchema = j.object.any().castAs<DBTransaction>()

// Schema that accepts any value (string, number, boolean, object, array, null)
const anyValueSchema = new JsonSchemaAnyBuilder<any, any, false>({})

export const commonDBOptionsSchema = (): JsonSchemaObjectBuilder<
  CommonDBOptions,
  CommonDBOptions
> =>
  j.object<CommonDBOptions>({
    tx: dbTransactionSchema.optional(),
  })

export const commonDBSaveOptionsSchema = <ROW extends ObjectWithId>() =>
  j.object<CommonDBSaveOptions<ROW>>({
    tx: dbTransactionSchema.optional(),
    excludeFromIndexes: j.array(j.string().castAs<keyof ROW>()).optional(),
    saveMethod: j.enum(['upsert', 'insert', 'update'] as const).optional(),
    assignGeneratedIds: j.boolean().optional(),
  })

export const dbQueryFilterOperatorSchema = j.enum(dbQueryFilterOperatorValues)

export const dbQueryFilterSchema = <ROW extends ObjectWithId>() =>
  j.object<DBQueryFilter<ROW>>({
    name: j.string().castAs<keyof ROW>(),
    op: dbQueryFilterOperatorSchema,
    val: anyValueSchema,
  })

export const dbQueryOrderSchema = <ROW extends ObjectWithId>() =>
  j.object<DBQueryOrder<ROW>>({
    name: j.string().castAs<keyof ROW>(),
    descending: j.boolean().optional(),
  })

export const dbQuerySchema = <ROW extends ObjectWithId>() =>
  j.object.infer({
    table: j.string(),
    _filters: j.array(dbQueryFilterSchema<ROW>()).optional(),
    _limitValue: j.number().integer().min(0).optional(),
    _offsetValue: j.number().integer().min(0).optional(),
    _orders: j.array(dbQueryOrderSchema<ROW>()).optional(),
    _startCursor: j.string().optional(),
    _endCursor: j.string().optional(),
    _selectedFieldNames: j.array(j.string().castAs<keyof ROW>()).optional(),
  })
