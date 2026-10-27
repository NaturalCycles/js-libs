import { it } from 'vitest'
import { InMemoryDB } from '../inmemory/inMemory.db.js'
import { tmpDir } from '../test/paths.cnst.js'
import { createTestItemsDBM, TEST_TABLE } from '../testing/index.js'
import { dbPipelineBackup } from './dbPipelineBackup.js'

it('should back up the db to ndjson files without throwing', async () => {
  const db = new InMemoryDB()

  const items = createTestItemsDBM(70)
  await db.saveBatch(TEST_TABLE, items)

  await dbPipelineBackup({
    db,
    outputDirPath: tmpDir,
    zst: false,
  })
})
