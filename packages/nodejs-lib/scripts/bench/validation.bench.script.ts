/*

pn tsx packages/nodejs-lib/scripts/bench/validation.bench.script.ts

ajvMutant x 180,417 ops/sec ±1.01% (96 runs sampled)
ajv x 7,372 ops/sec ±1.02% (98 runs sampled)
zod x 17,882 ops/sec ±0.19% (99 runs sampled)
joi x 874 ops/sec ±1.55% (95 runs sampled)

 */

import { runBench } from '@naturalcycles/bench-lib'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { z } from '@naturalcycles/js-lib/zod'
import { j } from '@naturalcycles/nodejs-lib/ajv'
import { runScript } from '../../src/script/runScript.js'
import { AjvSchema } from '../../src/validation/ajv/index.js'
import {
  arraySchema,
  booleanSchema,
  numberSchema,
  objectSchema,
  stringSchema,
  validate,
} from '../../src/validation/joi/index.js'

interface Item {
  s: string
  n1: number
  n2?: number
  b1?: boolean
  a: number[]
}

const joiSchema = objectSchema<Item>({
  s: stringSchema,
  n1: numberSchema,
  n2: numberSchema.optional(),
  b1: booleanSchema.optional(),
  a: arraySchema(numberSchema),
}).options({ convert: false })

// const jsonSchema1: JsonSchema = {
//   type: 'object',
//   properties: {
//     s: { type: 'string' },
//     n1: { type: 'integer' },
//     n2: { type: 'integer' },
//     b1: { type: 'boolean' },
//     a: { type: 'array', items: { type: 'integer' } },
//   },
//   required: ['s', 'n1', 'a'],
//   additionalProperties: false,
// }

const jsonSchema2 = j
  .object<Item>({
    s: j.string(),
    n1: j.number(),
    n2: j.number().optional(),
    b1: j.boolean().optional(),
    a: j.array(j.number()),
  })
  .build()

const ajvSchema = AjvSchema.create(jsonSchema2)

const zodSchema = z.object({
  s: z.string(),
  n1: z.number(),
  n2: z.number().optional(),
  b1: z.boolean().optional(),
  a: z.array(z.number()),
})

const items = _range(100).map(id => ({
  s: `id${id}`,
  n1: id,
  n2: 1,
  b1: id % 2 === 0,
  a: _range(id).map(n => n * 2),
}))

runScript(async () => {
  await runBench({
    fns: {
      joi: () => {
        items.forEach(item => {
          validate(item, joiSchema)
        })
      },
      zod: () => {
        items.forEach(item => {
          zodSchema.parse(item)
        })
      },
      ajv: () => {
        items.forEach(item => {
          ajvSchema.validate(item)
        })
      },
      ajvMutant: () => {
        items.forEach(item => {
          ajvSchema.validate(item, {
            mutateInput: true,
          })
        })
      },
    },
  })
})
