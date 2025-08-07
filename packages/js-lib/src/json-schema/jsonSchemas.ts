import type { BaseDBEntity } from '../types.js'
import { j } from './jsonSchemaBuilder.js'

export const baseDBEntityJsonSchema = j.object<BaseDBEntity>({
  id: j.string(),
  created: j.unixTimestamp2000(),
  updated: j.unixTimestamp2000(),
})
