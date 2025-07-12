/*

pn tsx scripts/debugStreams

 */

import fs from 'node:fs'
import { Readable, Writable } from 'node:stream'
import { createUnzip } from 'node:zlib'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { requireEnvKeys } from '../src/index.js'
import { runScript } from '../src/script/runScript.js'
import {
  _pipeline,
  transformJsonParse,
  transformLimit,
  transformMap,
  transformSplit,
  writableVoid,
} from '../src/stream/index.js'

/* eslint-disable */

interface AbortObject {
  aborted: boolean
}

// This readable returns next number when `read` is called,
// has a delay
// Should listen to `end` event and close itself when 0 receivers

// biome-ignore lint: ok
function readable(obj: AbortObject) {
  let i = 0
  const readableLimit = 100

  return new Readable({
    objectMode: true,
    async read(_size: number) {
      if (obj.aborted) {
        console.log(`read, but aborted=true, emitting null to close the stream`)
        return this.push(null)
      }

      const r = ++i
      console.log(`read return`, r)
      await pDelay(50)

      if (r >= readableLimit) {
        console.log('readable limit reached, pushing null to close it')
        this.push(null) // means the end
      } else {
        this.push(r) // crucial to call this push! Otherwise node process will do process.exit(0) ?!?!?!
      }
    },
    destroy(err, cb) {
      console.log(`readable.destroy called`, err)
      cb(null)
    },
  })
}

// biome-ignore lint: ok
function writable() {
  let i = 0
  return new Writable({
    objectMode: true,
    async write(_chunk, _enc, cb) {
      i++
      console.log(`write called with`, i)
      await pDelay(200)
      console.log(`written`, i)
      cb()
    },
    async final(cb) {
      console.log(`writable.final called`, i)
      await pDelay(2_000)
      console.log(`writable.final done`, i)
      cb()
    },
  })
}

process.on('beforeExit', code => {
  console.log('beforeExit', code)
})

runScript(async () => {
  const { SNAPSHOTS_DIR, SNAPSHOT_ID } = requireEnvKeys('SNAPSHOTS_DIR', 'SNAPSHOT_ID')

  await _pipeline(
    [
      fs.createReadStream(`${SNAPSHOTS_DIR}/${SNAPSHOT_ID}`),
      createUnzip(),
      transformSplit(),
      transformJsonParse(),
      transformLimit({ limit: 10, debug: true }),
      // writable(),
      transformMap(
        async (chunk, i) => {
          await pDelay(200)
          console.log(`transform`, i + 1)
          // if (i === 9) return END
          return chunk
        },
        {
          concurrency: 1,
        },
      ),
      // new Transform({
      //   objectMode: true,
      //   async transform(chunk, _, cb) {
      //     i++
      //     await pDelay(200)
      //     console.log(`transform`, i)
      //     cb(null, chunk)
      //   },
      // }),
      writableVoid(),
    ],
    { allowClose: true },
  )
  console.log('DONE')
})
