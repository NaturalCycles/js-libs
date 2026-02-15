/*

pnpm tsx packages/sqlite-lib/scripts/benchKeyValueDB.script.ts

Benchmarks CommonKeyValueDB implementations:
  1. SqliteKeyValueDB (sqlite3 + sqlite wrapper, async)
  2. BetterSqliteKeyValueDB (better-sqlite3, sync)
  3. NodeSqliteKeyValueDB (node:sqlite built-in, sync)

Step 1: Insert N rows into a table.
Step 2: Stream all entries and count them.

Runs both in-memory and file-based benchmarks.

*/

import { mkdirSync, unlinkSync } from 'node:fs'
import type {
  CommonKeyValueDB,
  CommonSyncKeyValueDB,
  KeyValueDBTuple,
} from '@naturalcycles/db-lib/kv'
import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { _range } from '@naturalcycles/js-lib/array/range.js'
import { _ms } from '@naturalcycles/js-lib/datetime/time.util.js'
import type { Promisable, UnixTimestampMillis } from '@naturalcycles/js-lib/types'
import { boldWhite } from '@naturalcycles/nodejs-lib/colors'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
const tmpDir = `${import.meta.dirname}/../tmp`

const ROWS = 100_000
const BATCH_SIZE = 1000

interface BenchResult {
  name: string
  insertMs: number
  streamMs: number
}

interface BenchableDB extends CommonKeyValueDB {
  createTable: (table: string, opt?: { dropIfExists?: boolean }) => Promise<void>
  close: () => void | Promise<void>
  count: (table: string) => Promise<number>
  beginTransaction: () => Promisable<void>
  endTransaction: () => Promisable<void>
}

runScript(async () => {
  const batches = toBatches(generateEntries(ROWS), BATCH_SIZE)

  await runSuite('In-memory', batches, ':memory:')

  mkdirSync(tmpDir, { recursive: true })
  await runSuite('File-based', batches, `${tmpDir}/bench`)
})

async function runSuite(
  label: string,
  batches: KeyValueDBTuple[][],
  filePrefix: string,
): Promise<void> {
  console.log(boldWhite(`\n${'='.repeat(50)}`))
  console.log(boldWhite(`${label} — ${ROWS} rows, batch size ${BATCH_SIZE}`))
  console.log(boldWhite('='.repeat(50)))

  const results: BenchResult[] = []

  // SqliteKeyValueDB (may fail due to sqlite3 ESM issues with tsx)
  try {
    const { SqliteKeyValueDB } = await import('../src/sqliteKeyValueDB.js')
    const filename = filePrefix === ':memory:' ? ':memory:' : `${filePrefix}_sqlite.db`
    const db = new SqliteKeyValueDB({ filename })
    results.push(await benchImpl('SqliteKeyValueDB', db, batches, filename))
  } catch {
    console.log(`\nSqliteKeyValueDB: skipped (sqlite3 not available)`)
  }

  // BetterSqliteKeyValueDB
  {
    const { BetterSqliteKeyValueDB } = await import('../src/betterSqliteKeyValueDB.js')
    const filename = filePrefix === ':memory:' ? ':memory:' : `${filePrefix}_better.db`
    const db = new BetterSqliteKeyValueDB({ filename })
    results.push(await benchImpl('BetterSqliteKeyValueDB', db, batches, filename))
  }

  // NodeSqliteKeyValueDB (async)
  {
    const { NodeSqliteKeyValueDB } = await import('../src/nodeSqliteKeyValueDB.js')
    const filename = filePrefix === ':memory:' ? ':memory:' : `${filePrefix}_node.db`
    const db = new NodeSqliteKeyValueDB({ filename })
    results.push(await benchImpl('NodeSqliteKeyValueDB', db, batches, filename))
  }

  // NodeSqliteKeyValueDB (sync API)
  {
    const { NodeSqliteKeyValueDB } = await import('../src/nodeSqliteKeyValueDB.js')
    const filename = filePrefix === ':memory:' ? ':memory:' : `${filePrefix}_node_sync.db`
    const db = new NodeSqliteKeyValueDB({ filename })
    results.push(await benchSyncImpl('NodeSqliteKeyValueDB (sync)', db, batches, filename))
  }

  printResults(results)
}

async function benchImpl(
  name: string,
  db: BenchableDB,
  batches: KeyValueDBTuple[][],
  filename: string,
): Promise<BenchResult> {
  console.log(`\n${boldWhite(name)}`)

  await db.ping()
  await db.createTable(TEST_TABLE, { dropIfExists: true })

  // Step 1: Insert (wrapped in a transaction for fair file-based comparison)
  const insertStart = Date.now() as UnixTimestampMillis

  await db.beginTransaction()
  for (const batch of batches) {
    await db.saveBatch(TEST_TABLE, batch)
  }
  await db.endTransaction()

  const insertMs = Date.now() - insertStart

  const count = await db.count(TEST_TABLE)
  console.log(`  insert: ${_ms(insertMs)} (${count} rows)`)

  // Step 2: Stream entries and count
  const streamStart = Date.now() as UnixTimestampMillis

  let streamCount = 0
  await db.streamEntries(TEST_TABLE).forEach(async () => {
    streamCount++
  })

  const streamMs = Date.now() - streamStart
  console.log(`  stream: ${_ms(streamMs)} (${streamCount} rows)`)

  await db.close()

  // Clean up file
  if (filename !== ':memory:') {
    try {
      unlinkSync(filename)
    } catch {}
  }

  return { name, insertMs, streamMs }
}

async function benchSyncImpl(
  name: string,
  db: CommonSyncKeyValueDB & {
    beginTransaction: () => void
    endTransaction: () => void
    close: () => void
  },
  batches: KeyValueDBTuple[][],
  filename: string,
): Promise<BenchResult> {
  console.log(`\n${boldWhite(name)}`)

  db.pingSync()
  db.createTableSync(TEST_TABLE, { dropIfExists: true })

  // Step 1: Insert (wrapped in a transaction for fair file-based comparison)
  const insertStart = Date.now() as UnixTimestampMillis

  db.beginTransaction()
  for (const batch of batches) {
    db.saveBatchSync(TEST_TABLE, batch)
  }
  db.endTransaction()

  const insertMs = Date.now() - insertStart

  const count = db.countSync(TEST_TABLE)
  console.log(`  insert: ${_ms(insertMs)} (${count} rows)`)

  // Step 2: Stream entries and count (Pipeline is always async)
  const streamStart = Date.now() as UnixTimestampMillis

  let streamCount = 0
  await db.streamEntries(TEST_TABLE).forEach(async () => {
    streamCount++
  })

  const streamMs = Date.now() - streamStart
  console.log(`  stream: ${_ms(streamMs)} (${streamCount} rows)`)

  db.close()

  // Clean up file
  if (filename !== ':memory:') {
    try {
      unlinkSync(filename)
    } catch {}
  }

  return { name, insertMs, streamMs }
}

function printResults(results: BenchResult[]): void {
  const nameWidth = Math.max(...results.map(r => r.name.length))

  console.log(boldWhite('\nInsert:'))
  const baselineInsert = results[0]!.insertMs
  for (const r of results) {
    const diff = ((r.insertMs / baselineInsert - 1) * 100).toFixed(0)
    const diffStr = r === results[0] ? 'baseline' : `${Number(diff) > 0 ? '+' : ''}${diff}%`
    console.log(`  ${r.name.padEnd(nameWidth)}  ${_ms(r.insertMs).padStart(10)}  ${diffStr}`)
  }

  console.log(boldWhite('\nStream:'))
  const baselineStream = results[0]!.streamMs
  for (const r of results) {
    const diff = ((r.streamMs / baselineStream - 1) * 100).toFixed(0)
    const diffStr = r === results[0] ? 'baseline' : `${Number(diff) > 0 ? '+' : ''}${diff}%`
    console.log(`  ${r.name.padEnd(nameWidth)}  ${_ms(r.streamMs).padStart(10)}  ${diffStr}`)
  }
}

function generateEntries(count: number): KeyValueDBTuple[] {
  return _range(1, count + 1).map(n => {
    const id = `id_${n}`
    const buf = Buffer.from(JSON.stringify({ id, n, even: n % 2 === 0 }))
    return [id, buf] as KeyValueDBTuple
  })
}

function toBatches(entries: KeyValueDBTuple[], batchSize: number): KeyValueDBTuple[][] {
  const batches: KeyValueDBTuple[][] = []
  for (let i = 0; i < entries.length; i += batchSize) {
    batches.push(entries.slice(i, i + batchSize))
  }
  return batches
}
