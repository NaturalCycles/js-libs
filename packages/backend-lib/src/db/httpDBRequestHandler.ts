import type { CommonDB, CommonDBOptions, CommonDBSaveOptions } from '@naturalcycles/db-lib'
import { DBQuery } from '@naturalcycles/db-lib'
import { InMemoryDB } from '@naturalcycles/db-lib/inmemory'
import {
  commonDBOptionsSchema,
  commonDBSaveOptionsSchema,
  dbQuerySchema,
} from '@naturalcycles/db-lib/validation'
import type { ObjectWithId } from '@naturalcycles/js-lib/types'
import { j } from '@naturalcycles/nodejs-lib/ajv'
import { getDefaultRouter } from '../express/getDefaultRouter.js'
import type { BackendRouter } from '../server/server.model.js'
import { validateRequest } from '../validation/ajv/validateRequest.js'

export interface GetByIdsInput {
  table: string
  ids: string[]
  opt?: CommonDBOptions
}

const getByIdsInputSchema = j.object<GetByIdsInput>({
  table: j.string(),
  ids: j.array(j.string()),
  opt: commonDBOptionsSchema().optional(),
})

export interface RunQueryInput {
  query: Partial<DBQuery<any>> & { table: string }
  opt?: CommonDBOptions
}

const runQueryInputSchema = j.object<RunQueryInput>({
  query: dbQuerySchema(),
  opt: commonDBOptionsSchema().optional(),
})

export interface SaveBatchInput {
  table: string
  rows: ObjectWithId[]
  opt?: CommonDBSaveOptions<any>
}

const saveBatchInputSchema = j.object<SaveBatchInput>({
  table: j.string(),
  rows: j.array(j.object<ObjectWithId>({ id: j.string() }).allowAdditionalProperties()),
  opt: commonDBSaveOptionsSchema().optional(),
})

/**
 * Exposes CommonDB interface from provided CommonDB as HTTP endpoint (Express RequestHandler).
 */
export function httpDBRequestHandler(db: CommonDB): BackendRouter {
  const router = getDefaultRouter()

  // resetCache, only applicable to InMemoryDB
  router.put('/resetCache{/:table}', async (req, res) => {
    if (db instanceof InMemoryDB) {
      await db.resetCache(req.params['table'])
    }
    res.end()
  })

  // ping
  router.get('/ping', async (_req, res) => {
    await db.ping()
    res.end()
  })

  // getTables
  router.get('/tables', async (_req, res) => {
    res.json(await db.getTables())
  })

  // getTableSchema
  router.get('/:table/schema', async (req, res) => {
    res.json(await db.getTableSchema(req.params['table']))
  })

  // todo: createTable
  // router.post('/tables/:table', async (req, res) => {
  //
  // })

  // getByIds
  router.put('/getByIds', async (req, res) => {
    const { table, ids, opt } = validateRequest.body(req, getByIdsInputSchema)
    res.json(await db.getByIds(table, ids, opt))
  })

  // runQuery
  router.put('/runQuery', async (req, res) => {
    const { query, opt } = validateRequest.body(req, runQueryInputSchema)
    const q = DBQuery.fromPlainObject(query)
    res.json(await db.runQuery(q, opt))
  })

  // runQueryCount
  router.put('/runQueryCount', async (req, res) => {
    const { query, opt } = validateRequest.body(req, runQueryInputSchema)
    const q = DBQuery.fromPlainObject(query)
    res.json(await db.runQueryCount(q, opt))
  })

  // saveBatch
  router.put('/saveBatch', async (req, res) => {
    const { table, rows, opt } = validateRequest.body(req, saveBatchInputSchema)
    await db.saveBatch(table, rows, opt)
    res.end()
  })

  // deleteByIds
  // router.put('/deleteByIds', reqValidation('body', getByIdsInputSchema), async (req, res) => {
  //   const { table, ids, opt } = req.body as GetByIdsInput
  //   res.json(await db.deleteByIds(table, ids, opt))
  // })

  // deleteByQuery
  router.put('/deleteByQuery', async (req, res) => {
    const { query, opt } = validateRequest.body(req, runQueryInputSchema)
    const q = DBQuery.fromPlainObject(query)
    res.json(await db.deleteByQuery(q, opt))
  })

  return router
}
