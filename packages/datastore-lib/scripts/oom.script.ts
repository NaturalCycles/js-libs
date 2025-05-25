/*

yarn tsx scripts/oom.script.ts

 */

import { Transform, Writable } from 'node:stream'
import { DBQuery } from '@naturalcycles/db-lib'
import {
  _pipeline,
  requireEnvKeys,
  runScript,
  transformLogProgress,
} from '@naturalcycles/nodejs-lib'
import { DatastoreDB } from '../src/index.js'

const { SECRET_GCP_SERVICE_ACCOUNT } = requireEnvKeys('SECRET_GCP_SERVICE_ACCOUNT')
process.env['APP_ENV'] = 'master'

const db = new DatastoreDB({
  credentials: JSON.parse(SECRET_GCP_SERVICE_ACCOUNT),
  streamOptions: {
    // experimentalCursorStream: true,
  },
})

// const TABLE = 'TEST1'
const TABLE = 'UserFertilityCache'

runScript(async () => {
  // prepare
  // const items = _range(0, 10_000).map(i => ({
  //   id: `id_${i}`,
  //   data: Buffer.alloc(1_000_000).fill(1),
  // }))
  //
  // console.log('items ok')
  //
  // await _pipeline([
  //   Readable.from(items),
  //   transformMap(async item => {
  //     await db.saveBatch(TABLE, [item], {
  //       excludeFromIndexes: ['data'],
  //     })
  //   }, {
  //     concurrency: 16,
  //     predicate: _passthroughPredicate,
  //   }),
  //   transformLogProgress({logEvery: 10}),
  //   writableVoid(),
  // ])

  await _pipeline([
    db.streamQuery(DBQuery.create(TABLE), {
      experimentalCursorStream: true,
      batchSize: 1000,
      rssLimitMB: 1000,
      singleBatchBuffer: true,
      debug: true,
    }),

    // This thing logs every 100's object + some memory and speed metrics
    transformLogProgress({
      metric: 'read',
      logEvery: 1000,
      peakRSS: true,
    }),

    // This is a fake Consumer that introduces a 100ms delay before passing the data further
    new Transform({
      objectMode: true,
      transform(chunk: any, _encoding, cb) {
        setTimeout(() => cb(null, chunk), 5)
      },
    }),

    transformLogProgress({
      metric: 'processed',
      logEvery: 1000,
      peakRSS: true,
    }),

    // This is a "no-op" consumer that just discards the data
    new Writable({
      objectMode: true,
      write(_c, _encoding, cb) {
        // console.log(c.id, c.data.length)
        cb()
      },
    }),
  ])
})
