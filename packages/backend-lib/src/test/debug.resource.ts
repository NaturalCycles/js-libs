import { AppError } from '@naturalcycles/js-lib/error/error.util.js'
import { z } from '@naturalcycles/js-lib/zod'
import { AjvSchema, j } from '@naturalcycles/nodejs-lib/ajv'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import { validateRequest } from '../validation/ajv/validateRequest.js'
import { zodValidateRequest } from '../validation/zod/zodValidateRequest.js'

const router = getDefaultRouter()
export const debugResource = router

router.get('/', async (_req, res) => {
  res.json({ ok: 1 })
})

interface PwInput {
  pw: string
}

const changePasswordSchemaAjv = AjvSchema.create<PwInput>(
  j.object<PwInput>({
    pw: j.string().minLength(8),
  }),
)

const changePasswordSchemaZod = z.object({
  pw: z.string().min(8),
})

router.put('/changePasswordAjv', async (req, res) => {
  const _ = validateRequest.body(req, changePasswordSchemaAjv, { redactPaths: ['pw'] })

  res.json({ ok: 1 })
})

router.put('/changePasswordZod', async (req, res) => {
  const _ = zodValidateRequest.body(req, changePasswordSchemaZod, { redactPaths: ['pw'] })

  res.json({ ok: 1 })
})

router.get('/asyncError', async () => {
  throw new AppError('debug_async_error', { backendResponseStatusCode: 501, dirtySecret: '51' })
})
