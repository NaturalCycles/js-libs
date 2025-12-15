import { describe } from 'vitest'
import { runCommonDaoTest, runCommonDBTest } from '../../testing/index.js'
import { FileDB } from './file.db.js'
import { LocalFilePersistencePlugin } from './localFile.persistence.plugin.js'

const db = new FileDB({
  plugin: new LocalFilePersistencePlugin({
    zst: false,
  }),
})

describe('runCommonDBTest', async () => {
  await runCommonDBTest(db)
})

describe('runCommonDaoTest', async () => {
  await runCommonDaoTest(db)
})
