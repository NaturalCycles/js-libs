import type { JsonSchema } from '@naturalcycles/js-lib/json-schema'
import type { GlobOptions } from 'tinyglobby'
import { globSync } from 'tinyglobby'
import { fs2 } from '../../fs/fs2.js'
import type { AjvSchemaCfg } from './ajvSchema.js'
import { AjvSchema } from './ajvSchema.js'

/**
 * Does fs.readFileSync + JSON.parse for ALL files matching the passed `glob` pattern.
 * E.g `someDir/**\/*.schema.json`
 *
 * Returns them as an array of JsonSchema.
 *
 * @experimental
 */
export function readJsonSchemas(
  patterns: string | string[],
  opt?: Omit<GlobOptions, 'patterns'>,
): JsonSchema[] {
  return globSync(patterns, opt).map(fileName => fs2.readJson(fileName))
}

/**
 * Reads json schemas from given dir (glob pattern).
 * Creates new AjvSchema for each of them (ajv validates them upon creation).
 * Passes `schemas` option to ajv, so, schemas may $ref each other and it'll be fine.
 *
 * @experimental
 */
export function readAjvSchemas(patterns: string | string[], cfg?: AjvSchemaCfg): AjvSchema[] {
  const schemas = readJsonSchemas(patterns)
  return schemas.map(schema =>
    AjvSchema.create(schema, {
      schemas,
      ...cfg,
    }),
  )
}
