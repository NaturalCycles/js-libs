const Module = require('node:module')
const path = require('node:path')
const originalLoad = Module._load
const { writeFileSync } = require('node:fs')

// const { TINYPOOL_WORKER_ID = 'x'} = process.env
const RUN_ID = String(Math.random()).slice(2)

const outputPath = path.join(__dirname, `/tmp/${RUN_ID}_timeHook.stats.json`)

let totalLoad = 0
const mapCount = {}
const mapTime = {}

Module._load = function (request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent)
  const start = process.hrtime.bigint()

  const result = originalLoad.apply(this, arguments)

  const end = process.hrtime.bigint()
  const time = Number(end - start) / 1e6
  totalLoad += time

  const t = resolved.split('node_modules/')
  let name = t[1] || t[0]

  mapCount[name] ||= 0
  mapCount[name]++
  mapTime[name] ||= 0
  mapTime[name] += time

  console.log(`${RUN_ID} ${time.toFixed(2)} ms, ${name} , total ${totalLoad.toFixed(2)}`)

  const sortedMapCount = Object.fromEntries(Object.entries(mapCount).sort((a, b) => b[1] - a[1]))
  const sortedMapTime = Object.fromEntries(Object.entries(mapTime).sort((a, b) => b[1] - a[1]))

  writeFileSync(outputPath, JSON.stringify({ sortedMapCount, sortedMapTime }, null, 2))

  return result
}
