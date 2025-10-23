import { _hb } from '@naturalcycles/js-lib'
import { localTime } from '@naturalcycles/js-lib/datetime/localTime.js'
import { ErrorMode } from '@naturalcycles/js-lib/error/errorMode.js'
import { _mapValues } from '@naturalcycles/js-lib/object'
import { pMap } from '@naturalcycles/js-lib/promise/pMap.js'
import type { AsyncMapper, BaseDBEntity, UnixTimestamp } from '@naturalcycles/js-lib/types'
import { _passthroughMapper } from '@naturalcycles/js-lib/types'
import type { JsonSchema } from '@naturalcycles/nodejs-lib/ajv'
import { boldWhite, dimWhite, grey, yellow } from '@naturalcycles/nodejs-lib/colors'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import {
  NDJsonStats,
  Pipeline,
  type TransformLogProgressOptions,
  type TransformMapOptions,
} from '@naturalcycles/nodejs-lib/stream'
import type { CommonDB } from '../commondb/common.db.js'
import type { CommonDBSaveOptions } from '../db.model.js'

export interface DBPipelineRestoreOptions extends TransformLogProgressOptions {
  /**
   * DB to save data to.
   */
  db: CommonDB

  /**
   * Directory path to store dumped files. Will create `${tableName}.ndjson` (or .ndjson.gz if gzip=true) files.
   * All parent directories will be created.
   */
  inputDirPath: string

  /**
   * List of tables to dump. If undefined - will dump all files that end with .ndjson (or .ndjson.gz) extension.
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
  batchSize?: number

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
   * @default false
   * If true - will read ${table}.schema.json files and recreate tables before importing.
   * Caution! Will do `drop table if exists`!!!
   */
  recreateTables?: boolean

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
 * Pipeline from NDJSON files in a folder (optionally gzipped) to CommonDB.
 * Allows to define a mapper and a predicate to map/filter objects between input and output.
 * Handles backpressure.
 *
 * Optionally you can provide mapperPerTable and @param transformMapOptions (one for all mappers) - it will run for each table.
 */
export async function dbPipelineRestore(opt: DBPipelineRestoreOptions): Promise<NDJsonStats> {
  const {
    db,
    concurrency = 16,
    chunkSize = 100,
    limit,
    sinceUpdated,
    inputDirPath,
    mapperPerTable = {},
    saveOptionsPerTable = {},
    transformMapOptions,
    errorMode = ErrorMode.SUPPRESS,
    recreateTables = false,
  } = opt
  const onlyTables = opt.tables && new Set(opt.tables)

  const sinceUpdatedStr = sinceUpdated ? ' since ' + grey(localTime(sinceUpdated).toPretty()) : ''

  console.log(
    `>> ${dimWhite('dbPipelineRestore')} started in ${grey(inputDirPath)}...${sinceUpdatedStr}`,
  )

  fs2.ensureDir(inputDirPath)

  const tablesToGzip = new Set<string>()
  const sizeByTable: Record<string, number> = {}
  const statsPerTable: Record<string, NDJsonStats> = {}
  const tables: string[] = []
  fs2.readdir(inputDirPath).forEach(f => {
    let table: string
    let gzip = false

    if (f.endsWith('.ndjson')) {
      table = f.slice(0, f.length - '.ndjson'.length)
    } else if (f.endsWith('.ndjson.gz')) {
      table = f.slice(0, f.length - '.ndjson.gz'.length)
      gzip = true
    } else {
      return
    }

    if (onlyTables && !onlyTables.has(table)) return // skip table

    tables.push(table)
    if (gzip) tablesToGzip.add(table)
    sizeByTable[table] = fs2.stat(`${inputDirPath}/${f}`).size
  })

  const sizeStrByTable = _mapValues(sizeByTable, (_k, b) => _hb(b))

  console.log(`${yellow(tables.length)} ${boldWhite('table(s)')}:\n`, sizeStrByTable)

  // const schemaByTable: Record<string, CommonSchema> = {}

  if (recreateTables) {
    await pMap(tables, async table => {
      const schemaFilePath = `${inputDirPath}/${table}.schema.json`
      if (!fs2.pathExists(schemaFilePath)) {
        console.warn(`${schemaFilePath} does not exist!`)
        return
      }

      const schema = await fs2.readJsonAsync<JsonSchema<any>>(schemaFilePath)
      await db.createTable(table, schema, { dropIfExists: true })
    })
  }

  await pMap(
    tables,
    async table => {
      const gzip = tablesToGzip.has(table)
      const filePath = `${inputDirPath}/${table}.ndjson` + (gzip ? '.gz' : '')
      const saveOptions: CommonDBSaveOptions<any> = saveOptionsPerTable[table] || {}

      const started = Date.now()
      let rows = 0

      const sizeBytes = sizeByTable[table]

      console.log(`<< ${grey(filePath)} ${dimWhite(_hb(sizeBytes))} started...`)

      await Pipeline.fromNDJsonFile<BaseDBEntity>(filePath)
        .limitSource(limit)
        .tapSync(() => rows++)
        .logProgress({
          logEvery: 1000,
          ...opt,
          metric: table,
        })
        .filterSync(r => !sinceUpdated || r.updated >= sinceUpdated)
        .map(mapperPerTable[table] || _passthroughMapper, {
          errorMode,
          ...transformMapOptions,
          metric: table,
        })
        .flattenIfNeeded()
        .chunk(chunkSize)
        .forEach(async dbms => {
          await db.saveBatch(table, dbms, saveOptions)
        })

      const stats = NDJsonStats.create({
        tookMillis: Date.now() - started,
        rows,
        sizeBytes,
      })

      console.log(`<< ${grey(filePath)}\n` + stats.toPretty())

      statsPerTable[table] = stats
    },
    { concurrency, errorMode },
  )

  const statsTotal = NDJsonStats.createCombined(Object.values(statsPerTable))

  console.log(statsTotal.toPretty('total'))

  return statsTotal
}
