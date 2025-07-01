export * from './zod.shared.schemas.js'
export * from './zod.util.js'
import { z as zod, ZodType } from 'zod/v4'
import { customZodSchemas, type ExtendedZod } from './zod.shared.schemas.js'

const z: ExtendedZod = Object.assign({}, { ...zod, ...customZodSchemas })

export { z, ZodType }
