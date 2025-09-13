import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { AppError, ErrorMode } from '@naturalcycles/js-lib/error'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import type { AsyncMapper, StringMap, UnixTimestamp } from '@naturalcycles/js-lib/types'
import { _passthroughMapper } from '@naturalcycles/js-lib/types'
import { boldWhite, dimWhite, grey, yellow } from '@naturalcycles/nodejs-lib/colors'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import type {
  TransformLogProgressOptions,
  TransformMapOptions,
} from '@naturalcycles/nodejs-lib/stream'
import { NDJsonStats } from '@naturalcycles/nodejs-lib/stream'
import type { CommonDB } from '../commondb/common.db.js'
import { DBQuery } from '../query/dbQuery.js'

export interface DBPipelineBackupOptions extends TransformLogProgressOptions {
  /**
   * DB to dump data from.
   */
  db: CommonDB

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
   */
  sinceUpdated?: UnixTimestamp

  /**
   * Map for each table a `sinceUpdated` timestamp, or `undefined`.
   * If set - will do "incremental backup" (not full), only for entities that updated >= `sinceUpdated` (on a per table basis)
   */
  sinceUpdatedPerTable?: StringMap<UnixTimestamp>

  /**
   * By default, dbPipelineBackup creates a Query based on sinceUpdated.
   * But if queryPerTable is set for a table - it will override the Query that is ran for that table
   * (and ignore sinceUpdated, sinceUpdatedPerTable, limit, and any other properties that modify the query).
   */
  queryPerTable?: StringMap<DBQuery<any>>

  /**
   * Directory path to store dumped files. Will create `${tableName}.ndjson` (or .ndjson.gz if gzip=true) files.
   * All parent directories will be created.
   *
   * @default to process.cwd()
   */
  outputDirPath: string

  /**
   * @default false
   * If true - will fail if output file already exists.
   */
  protectFromOverwrite?: boolean

  /**
   * @default true
   */
  gzip?: boolean

  /**
   * Only applicable if `gzip` is enabled
   * Currently not available.
   */
  // zlibOptions?: ZlibOptions

  /**
   * Optionally you can provide mapper that is going to run for each table.
   *
   * @default `{}`
   * Default mappers will be "passthroughMapper" (pass all data as-is).
   */
  mapperPerTable?: StringMap<AsyncMapper>

  /**
   * If defined - it'll use that `logEvery` for that table.
   * Default logEvery is 1000.
   */
  logEveryPerTable?: StringMap<number>

  /**
   * You can alter default `transformMapOptions` here.
   *
   * @default (see the code)
   * The goal to have default values that are reasonable for such a job to provide resilient output (forgiving individual errors).
   * `metric` will be set to table name
   */
  transformMapOptions?: TransformMapOptions

  /**
   * @default false
   * If true - will use CommonSchemaGenerator to detect schema from input data.
   */
  // emitSchemaFromData?: boolean

  /**
   * @default false
   * If true - will use CommonDB.getTableSchema() and emit schema.
   */
  emitSchemaFromDB?: boolean
}

/**
 * Pipeline from input stream(s) to a NDJSON file (optionally gzipped).
 * File is overwritten (by default).
 * Input stream can be a stream from CommonDB.streamQuery()
 * Allows to define a mapper and a predicate to map/filter objects between input and output.
 * Handles backpressure.
 *
 * Optionally you can provide mapperPerTable and @param transformMapOptions (one for all mappers) - it will run for each table.
 */
export async function dbPipelineBackup(opt: DBPipelineBackupOptions): Promise<NDJsonStats> {
  const {
    db,
    concurrency = 16,
    limit = 0,
    outputDirPath,
    protectFromOverwrite = false,
    mapperPerTable = {},
    queryPerTable = {},
    logEveryPerTable = {},
    transformMapOptions,
    errorMode = ErrorMode.SUPPRESS,
    emitSchemaFromDB = false,
  } = opt
  const gzip = opt.gzip !== false // default to true

  let { tables } = opt

  console.log(`>> ${dimWhite('dbPipelineBackup')} started in ${grey(outputDirPath)}...`)

  fs2.ensureDir(outputDirPath)

  tables ||= await db.getTables()

  console.log(`${yellow(tables.length)} ${boldWhite('table(s)')}:\n` + tables.join('\n'))

  const statsPerTable: Record<string, NDJsonStats> = {}

  await pMap(
    tables,
    async table => {
      let q = DBQuery.create<any>(table).limit(limit)

      const sinceUpdated = opt.sinceUpdatedPerTable?.[table] ?? opt.sinceUpdated
      if (sinceUpdated) {
        q = q.filter('updated', '>=', sinceUpdated)
      }

      if (queryPerTable[table]) {
        // Override the Query with this Query, completely ingoring any of the other query-related options
        q = queryPerTable[table]!

        console.log(`>> ${grey(table)} ${q.pretty()}`)
      } else {
        const sinceUpdatedStr = sinceUpdated
          ? ' since ' + grey(localTime(sinceUpdated).toPretty())
          : ''
        console.log(`>> ${grey(table)}${sinceUpdatedStr}`)
      }

      const filePath = `${outputDirPath}/${table}.ndjson` + (gzip ? '.gz' : '')
      const schemaFilePath = `${outputDirPath}/${table}.schema.json`

      if (protectFromOverwrite && fs2.pathExists(filePath)) {
        throw new AppError(`dbPipelineBackup: output file exists: ${filePath}`)
      }

      const started = Date.now()
      let rows = 0

      fs2.ensureFile(filePath)

      // console.log(`>> ${grey(filePath)} started...`)

      if (emitSchemaFromDB) {
        const schema = await db.getTableSchema(table)
        await fs2.writeJsonAsync(schemaFilePath, schema, { spaces: 2 })
        console.log(`>> ${grey(schemaFilePath)} saved (generated from DB)`)
      }

      await db
        .streamQuery(q)
        .logProgress({
          ...opt,
          logEvery: logEveryPerTable[table] ?? opt.logEvery ?? 1000,
          metric: table,
        })
        .map(mapperPerTable[table] || _passthroughMapper, {
          errorMode,
          ...transformMapOptions,
          metric: table,
        })
        .flattenIfNeeded()
        .tapSync(() => rows++)
        .toNDJsonFile(filePath)

      const { size: sizeBytes } = await fs2.statAsync(filePath)

      const stats = NDJsonStats.create({
        tookMillis: Date.now() - started,
        rows,
        sizeBytes,
      })

      console.log(`>> ${grey(filePath)}\n` + stats.toPretty())

      statsPerTable[table] = stats
    },
    { concurrency, errorMode },
  )

  const statsTotal = NDJsonStats.createCombined(Object.values(statsPerTable))

  console.log(statsTotal.toPretty('total'))

  return statsTotal
}
