import { localTime } from '@naturalcycles/js-lib/datetime'
import { ErrorMode } from '@naturalcycles/js-lib/error'
import { pMap } from '@naturalcycles/js-lib/promise'
import type { AsyncMapper, BaseDBEntity, UnixTimestamp } from '@naturalcycles/js-lib/types'
import { _passthroughMapper } from '@naturalcycles/js-lib/types'
import { boldWhite, dimWhite, grey, yellow } from '@naturalcycles/nodejs-lib/colors'
import type {
  TransformLogProgressOptions,
  TransformMapOptions,
} from '@naturalcycles/nodejs-lib/stream'
import {
  _pipeline,
  NDJsonStats,
  transformChunk,
  transformLogProgress,
  transformMap,
  transformTap,
  writableForEach,
} from '@naturalcycles/nodejs-lib/stream'
import type { CommonDB } from '../commondb/common.db.js'
import type { CommonDBSaveOptions } from '../db.model.js'
import { DBQuery } from '../query/dbQuery.js'

export interface DBPipelineCopyOptions extends TransformLogProgressOptions {
  dbInput: CommonDB
  dbOutput: CommonDB

  /**
   * List of tables to dump. If undefined - will call CommonDB.getTables() and dump ALL tables returned.
   */
  tables?: string[]

  /**
   * How many tables to dump in parallel.
   *
   * @default 16
   * Set to `1` for serial (1 at a time) processing or debugging.
   */
  concurrency?: number

  /**
   * @default 100
   *
   * Determines the size of .saveBatch()
   */
  chunkSize?: number

  /**
   * @default ErrorMode.SUPPRESS
   *
   * Used in high-level pMap(tables, ...)
   * Also used as default option for TransformMapOptions
   */
  errorMode?: ErrorMode

  /**
   * @default undefined
   * If set - will dump maximum that number of rows per table
   */
  limit?: number

  /**
   * If set - will do "incremental backup" (not full), only for entities that updated >= `sinceUpdated`
   *
   * @default undefined
   */
  sinceUpdated?: UnixTimestamp

  /**
   * Optionally you can provide mapper that is going to run for each table.
   *
   * @default `{}`
   * Default mappers will be "passthroughMapper" (pass all data as-is).
   */
  mapperPerTable?: Record<string, AsyncMapper>

  /**
   * You can alter default `transformMapOptions` here.
   *
   * @default (see the code)
   * The goal to have default values that are reasonable for such a job to provide resilient output (forgiving individual errors).
   * `metric` will be set to table name
   */
  transformMapOptions?: TransformMapOptions

  saveOptionsPerTable?: Record<string, CommonDBSaveOptions<any>>
}

/**
 * Pipeline from input stream(s) to CommonDB .saveBatch().
 * Input stream can be a stream from CommonDB.streamQuery()
 * Allows to define a mapper and a predicate to map/filter objects between input and output.
 * Handles backpressure.
 */
export async function dbPipelineCopy(opt: DBPipelineCopyOptions): Promise<NDJsonStats> {
  const {
    chunkSize = 100,
    dbInput,
    dbOutput,
    concurrency = 16,
    limit = 0,
    sinceUpdated,
    mapperPerTable = {},
    saveOptionsPerTable = {},
    transformMapOptions,
    errorMode = ErrorMode.SUPPRESS,
  } = opt

  let { tables } = opt

  const sinceUpdatedStr = sinceUpdated ? ' since ' + grey(localTime(sinceUpdated).toPretty()) : ''

  console.log(`>> ${dimWhite('dbPipelineCopy')} started...${sinceUpdatedStr}`)

  tables ||= await dbInput.getTables()

  console.log(`${yellow(tables.length)} ${boldWhite('table(s)')}:\n` + tables.join('\n'))

  const statsPerTable: Record<string, NDJsonStats> = {}

  await pMap(
    tables,
    async table => {
      let q = DBQuery.create<BaseDBEntity>(table).limit(limit)

      if (sinceUpdated) {
        q = q.filter('updated', '>=', sinceUpdated)
      }

      const saveOptions: CommonDBSaveOptions<any> = saveOptionsPerTable[table] || {}
      const mapper = mapperPerTable[table] || _passthroughMapper

      const stream = dbInput.streamQuery(q)

      const started = Date.now()
      let rows = 0

      await _pipeline([
        stream,
        transformLogProgress({
          logEvery: 1000,
          ...opt,
          metric: table,
        }),
        transformMap(mapper, {
          errorMode,
          flattenArrayOutput: true,
          ...transformMapOptions,
          metric: table,
        }),
        transformTap(() => rows++),
        transformChunk({ chunkSize }),
        writableForEach(async dbms => {
          await dbOutput.saveBatch(table, dbms, saveOptions)
        }),
      ])

      const stats = NDJsonStats.create({
        tookMillis: Date.now() - started,
        rows,
        sizeBytes: 0, // n/a
      })

      console.log(`>> ${grey(table)}\n` + stats.toPretty())

      statsPerTable[table] = stats
    },
    { concurrency, errorMode },
  )

  const statsTotal = NDJsonStats.createCombined(Object.values(statsPerTable))

  console.log(statsTotal.toPretty('total'))

  return statsTotal
}
