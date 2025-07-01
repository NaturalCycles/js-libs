import { AjvSchema } from '@naturalcycles/nodejs-lib/ajv'
import { expect, test } from 'vitest'
import { _range } from '../../index.js'
import { generateJsonSchemaFromData } from './generateJsonSchemaFromData.js'

test('generateJsonSchemaFromData1', () => {
  const data1 = _range(5).map(i => {
    return { a: 'a', n: i, b: i % 2 === 0, c: null, u: undefined }
  })

  const s = generateJsonSchemaFromData(data1)
  // console.log(s)
  expect(s).toMatchInlineSnapshot(`
    {
      "additionalProperties": true,
      "properties": {
        "a": {
          "type": "string",
        },
        "b": {
          "type": "boolean",
        },
        "c": {
          "type": "null",
        },
        "n": {
          "type": "number",
        },
      },
      "required": [],
      "type": "object",
    }
  `)

  const schema = AjvSchema.create(s)
  data1.forEach(r => schema.validate(r))
})

test('generateJsonSchemaFromData2', () => {
  const data2 = _range(20).map(i => {
    const r: any = { a: 'a', n: i, b: i % 2 === 0, u: undefined }

    if (i % 3 === 0) {
      r.c = null

      r.sub = {
        aa: 'aa',
        sub2: {
          n: null,
          b: false,
        },
      }
    }

    if (i % 4 === 0) {
      r.sub = false
    }

    if (i % 5 === 0) {
      r.arr = [1, 2, 3]
      r.arr2 = [1, 2, 3, 'str', true, { a: 's' }]
    }

    return r
  })

  const s = generateJsonSchemaFromData(data2)

  // console.log(JSON.stringify(s, null, 2))
  // console.log(inspectAny(s, {
  //   depth: 100,
  //   maxLen: 1000000,
  // }))
  expect(s).toMatchSnapshot()

  const schema = AjvSchema.create(s)
  data2.forEach(r => schema.validate(r))
})
