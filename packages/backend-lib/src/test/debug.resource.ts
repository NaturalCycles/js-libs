import { AppError, jsonSchema } from '@naturalcycles/js-lib'
import { z } from '@naturalcycles/js-lib/zod'
import { AjvSchema, objectSchema, stringSchema } from '@naturalcycles/nodejs-lib'
import { getDefaultRouter } from '../server/getDefaultRouter.js'
import { ajvValidateRequest } from '../server/validation/ajvValidateRequest.js'
import { validateRequest } from '../server/validation/validateRequest.js'
import { zodValidateRequest } from '../server/validation/zodValidateRequest.js'

const router = getDefaultRouter()
export const debugResource = router

router.get('/', async (_req, res) => {
  res.json({ ok: 1 })
})

interface PwInput {
  pw: string
}

const changePasswordSchema = objectSchema<PwInput>({
  pw: stringSchema.min(8),
})

const changePasswordSchemaAjv = AjvSchema.create<PwInput>(
  jsonSchema.object<PwInput>({
    pw: jsonSchema.string().min(8),
  }),
)

const changePasswordSchemaZod = z.object({
  pw: z.string().min(8),
})

router.put('/changePasswordJoi', async (req, res) => {
  const _input = validateRequest.body(req, changePasswordSchema, { redactPaths: ['pw'] })

  res.json({ ok: 1 })
})

router.put('/changePasswordAjv', async (req, res) => {
  const _input = ajvValidateRequest.body(req, changePasswordSchemaAjv, { redactPaths: ['pw'] })

  res.json({ ok: 1 })
})

router.put('/changePasswordZod', async (req, res) => {
  const _input = zodValidateRequest.body(req, changePasswordSchemaZod, { redactPaths: ['pw'] })

  res.json({ ok: 1 })
})

router.get('/asyncError', async () => {
  throw new AppError('debug_async_error', { backendResponseStatusCode: 501, dirtySecret: '51' })
})
