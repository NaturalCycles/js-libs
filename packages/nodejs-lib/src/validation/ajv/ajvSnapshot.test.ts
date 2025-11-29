import type { JSONSchemaType } from 'ajv'
import prettier from 'prettier'
import { expect, test } from 'vitest'
import { createAjv } from './getAjv.js'
import { j } from './jsonSchemaBuilder.js'
// oxlint-disable no-var-requires, no-require-imports, no-commonjs, extensions
const standaloneCode = require('ajv/dist/standalone')

const ajv = createAjv({
  code: {
    source: true,
    esm: true,
  },
})

test('snapshot ajv schema', async () => {
  const jsonSchema = j.object
    .infer({
      s: j.string(),
    })
    .build()
  const fn = ajv.compile(jsonSchema as JSONSchemaType<any>)
  const rawCode = standaloneCode(ajv, fn)
  const code = await prettify(rawCode)
  expect(code).toMatchInlineSnapshot(`
    "'use strict'
    export const validate = validate20
    export default validate20
    const schema31 = {
      type: 'object',
      properties: { s: { type: 'string' } },
      required: ['s'],
      additionalProperties: false,
    }
    function validate20(
      data,
      {
        instancePath = '',
        parentData,
        parentDataProperty,
        rootData = data,
        dynamicAnchors = {},
      } = {},
    ) {
      let vErrors = null
      let errors = 0
      const evaluated0 = validate20.evaluated
      if (evaluated0.dynamicProps) {
        evaluated0.props = undefined
      }
      if (evaluated0.dynamicItems) {
        evaluated0.items = undefined
      }
      if (data && typeof data == 'object' && !Array.isArray(data)) {
        if (data.s === undefined) {
          const err0 = {
            instancePath,
            schemaPath: '#/required',
            keyword: 'required',
            params: { missingProperty: 's' },
            message: "must have required property '" + 's' + "'",
          }
          if (vErrors === null) {
            vErrors = [err0]
          } else {
            vErrors.push(err0)
          }
          errors++
        }
        for (const key0 in data) {
          if (!(key0 === 's')) {
            delete data[key0]
          }
        }
        if (data.s !== undefined) {
          if (typeof data.s !== 'string') {
            const err1 = {
              instancePath: instancePath + '/s',
              schemaPath: '#/properties/s/type',
              keyword: 'type',
              params: { type: 'string' },
              message: 'must be string',
            }
            if (vErrors === null) {
              vErrors = [err1]
            } else {
              vErrors.push(err1)
            }
            errors++
          }
        }
      } else {
        const err2 = {
          instancePath,
          schemaPath: '#/type',
          keyword: 'type',
          params: { type: 'object' },
          message: 'must be object',
        }
        if (vErrors === null) {
          vErrors = [err2]
        } else {
          vErrors.push(err2)
        }
        errors++
      }
      validate20.errors = vErrors
      return errors === 0
    }
    validate20.evaluated = { props: true, dynamicProps: false, dynamicItems: false }
    "
  `)
})

async function prettify(s: string): Promise<string> {
  return await prettier.format(s, {
    parser: 'babel',
    semi: false,
    singleQuote: true,
  })
}
