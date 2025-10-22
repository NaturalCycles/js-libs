/*

pn tsx packages/nodejs-lib/scripts/bench/schemaCompilation.bench.script.ts

 */

import { runBenchScript } from '@naturalcycles/bench-lib'
import { _assert } from '@naturalcycles/js-lib/error/assert.js'
import { z } from '@naturalcycles/js-lib/zod'
import { j } from '@naturalcycles/nodejs-lib/ajv'
import { AjvSchema } from '../../src/validation/ajv/index.js'
import {
  arraySchema,
  booleanSchema,
  numberSchema,
  objectSchema,
  stringSchema,
} from '../../src/validation/joi/index.js'

interface Item {
  s: string
  n1: number
  n2?: number
  b1?: boolean
  a: number[]
}

const item: Item = {
  s: `id1`,
  n1: 1,
  n2: 1,
  b1: false,
  a: [1],
}

let _sink: any

const jsonSchema2 = j
  .object({
    s: j.string(),
    n1: j.number(),
    n2: j.number().optional(),
    b1: j.boolean().optional(),
    a: j.array(j.number()),
  })
  .isOfType<Item>()
  .build()

// const ajv = getAjv()

runBenchScript({
  fns: {
    joi: () => {
      const schema = objectSchema<Item>({
        s: stringSchema,
        n1: numberSchema,
        n2: numberSchema.optional(),
        b1: booleanSchema.optional(),
        a: arraySchema(numberSchema),
      })
      _sink = schema.validate(item)
      _assert(_sink.error === undefined)
      _assert(!!_sink.value)
    },
    zod: () => {
      const schema = z.object({
        s: z.string(),
        n1: z.number(),
        n2: z.number().optional(),
        b1: z.boolean().optional(),
        a: z.array(z.number()),
      })
      _sink = schema.safeParse(item)
      _assert(_sink.error === undefined)
      _assert(!!_sink.data)
    },
    ajvEager: () => {
      const schema = AjvSchema.create(jsonSchema2)
      _sink = schema.getValidationResult(item)
      _assert(_sink === undefined)
    },
    ajvLazy: () => {
      const schema = AjvSchema.createLazy(jsonSchema2)
      _sink = schema.getValidationResult(item)
      _assert(_sink === undefined)
    },
    // ajvEagerWithAjv: () => {
    //   const schema = AjvSchema.create(jsonSchema2, {
    //     ajv,
    //   })
    //   _sink = schema.getValidationError(item)
    //   _assert(_sink === undefined)
    // },
    // ajvLazyWithAjv: () => {
    //   const schema = AjvSchema.createLazy(jsonSchema2, {
    //     ajv,
    //   })
    //   _sink = schema.getValidationError(item)
    //   _assert(_sink === undefined)
    // },
  },
})
