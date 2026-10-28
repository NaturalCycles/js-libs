import { _sortBy } from '@naturalcycles/js-lib/array/sort.js'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { expect, it } from 'vitest'
import { InMemoryDB } from '../inmemory/inMemory.db.js'
import { tmpDir } from '../test/paths.cnst.js'
import type { TestItemDBM } from '../testing/index.js'
import { createTestItemsDBM, TEST_TABLE } from '../testing/index.js'
import { dbPipelineBackup } from './dbPipelineBackup.js'

it('should back up the rows of each table to an ndjson file and return the row count', async () => {
  const db = new InMemoryDB()

  const items = createTestItemsDBM(70)
  await db.saveBatch(TEST_TABLE, items)

  const stats = await dbPipelineBackup({
    db,
    outputDirPath: tmpDir,
    zst: false,
  })

  expect(stats.rows).toBe(70)
  const lines = (await fs2.readTextAsync(`${tmpDir}/${TEST_TABLE}.ndjson`)).trimEnd().split('\n')
  const rows: TestItemDBM[] = lines.map(line => JSON.parse(line))
  expect(_sortBy(rows, r => r.id)).toEqual(_sortBy(items, r => r.id))
})
