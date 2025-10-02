import type { BaseDBEntity } from '../types.js'
import { j } from './jsonSchemaBuilder.js'

export const baseDBEntityJsonSchema = j.object<BaseDBEntity>({
  id: j.string(),
  created: j.integer().unixTimestamp2000(),
  updated: j.integer().unixTimestamp2000(),
})
