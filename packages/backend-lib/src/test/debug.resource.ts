import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import { z } from '@naturalcycles/js-lib/zod'
import { AjvSchema, j } from '@naturalcycles/nodejs-lib/ajv'
import { objectSchema, stringSchema } from '@naturalcycles/nodejs-lib/joi'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import { ajvValidateRequest } from '../validation/ajv/ajvValidateRequest.js'
import { validateRequest } from '../validation/joi/joiValidateRequest.js'
import { zodValidateRequest } from '../validation/zod/zodValidateRequest.js'

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
  j
    .object({
      pw: j.string().min(8),
    })
    .isOfType<PwInput>(),
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
