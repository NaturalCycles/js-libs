const started = Date.now()
import { inspect } from 'node:util'
import { workerData, parentPort } from 'node:worker_threads'
const { workerFile, workerIndex, logEvery = 1000, metric = 'worker', silent } = workerData || {}

if (!workerFile) {
  throw new Error('workerData.workerFile is required!')
}

// console.log(`worker#${workerIndex} created`)

try {
  const { register } = await import('tsx/esm/api')
  register() // https://tsx.is/dev-api/register-esm
} catch {} // require if exists

const { WorkerClass } = await import(workerFile)
const worker = new WorkerClass(workerData)

log(`${metric}#${workerIndex} loaded in ${Date.now() - started} ms`)

let errors = 0
let processed = 0

parentPort.on('message', async msg => {
  if (msg === null) {
    // console.log(`EXIT (null) received by ${index}, exiting`)
    parentPort.close()

    logStats(true)

    return
  }

  // console.log(`message received by worker ${index}: `, msg)

  try {
    const out = await worker.process(msg.payload, msg.index)

    parentPort.postMessage({
      index: msg.index,
      payload: out,
    })

    processed++

    if (processed % logEvery === 0) logStats()
  } catch (err) {
    parentPort.postMessage({
      index: msg.index,
      error: err,
    })

    errors++
    log(`${metric}#${workerIndex} errors: ${errors}`)
  }
})

const inspectOpt = {
  colors: true,
  breakLength: 120,
}

function logStats(final) {
  const { rss, heapUsed, heapTotal, external } = process.memoryUsage()

  log(
    inspect(
      {
        [`${metric}${workerIndex}`]: processed,
        errors,
        heapUsed: mb(heapUsed),
        heapTotal: mb(heapTotal),
        rss: mb(rss),
        external: mb(external),
        ...(final ? { final: true } : {}),
      },
      inspectOpt,
    ),
  )
}

function mb(b) {
  return Math.round(b / (1024 * 1024))
}

function log(...args) {
  if (silent) return
  console.log(...args)
}
