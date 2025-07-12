import { expect, test } from 'vitest'
import { testDir } from '../../test/paths.cnst.js'
import { readAjvSchemas, readJsonSchemas } from './ajv.util.js'

const schemaDir = `${testDir}/schema`

test('readJsonSchemas', () => {
  const schemas = readJsonSchemas(`${schemaDir}/**/*.schema.json`)
  const schemaNames = schemas.map(s => s.$id)
  expect(schemaNames).toMatchInlineSnapshot(`
    [
      "TestType.schema.json",
      "simple.schema.json",
    ]
  `)
})

test('readAjvSchemas', () => {
  const schemas = readAjvSchemas(`${schemaDir}/**/*.schema.json`)
  const schemaNames = schemas.map(s => s.cfg.objectName)
  expect(schemaNames).toMatchInlineSnapshot(`
    [
      "TestType",
      "simple",
    ]
  `)
})
