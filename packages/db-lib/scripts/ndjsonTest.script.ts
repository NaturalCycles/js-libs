/*

pn tsx scripts/ndjsonTest.script.ts

 */

import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import { InMemoryDB } from '../src/inmemory/index.js'
import { dbPipelineBackup, dbPipelineCopy, dbPipelineRestore } from '../src/pipeline/index.js'
import { tmpDir } from '../src/test/paths.cnst.js'
import { createTestItemsDBM, TEST_TABLE } from '../src/testing/index.js'

runScript(async () => {
  const fileDB1 = new InMemoryDB({
    // persistenceEnabled: true,
    // persistentStoragePath: `${tmpDir}/storage1`,
  })

  const fileDB2 = new InMemoryDB({
    // persistenceEnabled: true,
    // persistentStoragePath: `${tmpDir}/storage2`,
  })

  const fileDB3 = new InMemoryDB({
    // persistenceEnabled: true,
    // persistentStoragePath: `${tmpDir}/storage3`,
  })

  const items = createTestItemsDBM(30)

  await fileDB1.saveBatch(TEST_TABLE, items)

  await dbPipelineCopy({
    dbInput: fileDB1,
    dbOutput: fileDB2,
    // limit: 2,
  })

  const backupDir = `${tmpDir}/backup`

  await dbPipelineBackup({
    db: fileDB2,
    outputDirPath: backupDir,
    // emitSchemaFromDB: true,
    // emitSchemaFromData: true,
  })

  await dbPipelineRestore({
    db: fileDB3,
    inputDirPath: backupDir,
    recreateTables: true,
  })
})
