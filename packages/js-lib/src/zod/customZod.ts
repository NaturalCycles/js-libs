import { z as z4, ZodType } from 'zod/v4'
import { customZodSchemas } from './zod.shared.schemas.js'

type ExtendedZod = Omit<typeof z4, keyof typeof customZodSchemas | 'iso'> & typeof customZodSchemas

const z: ExtendedZod = { ...z4, ...customZodSchemas }

// eslint-disable-next-line @typescript-eslint/naming-convention
type zInfer<T> = z4.infer<T>

export { z, type zInfer, ZodType }
