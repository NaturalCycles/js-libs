import { _range } from '@naturalcycles/js-lib/array/range.js'
import { pDefer } from '@naturalcycles/js-lib/promise/pDefer.js'
import { dimGrey, green, grey, red, yellow } from '@naturalcycles/nodejs-lib/colors'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { runScript } from '@naturalcycles/nodejs-lib/runScript'
import type { Event, Suite } from 'benchmark'
import Benchmark from 'benchmark'
import { plotAsciiChart } from './asciiChart.util.js'
import type { HertzMap, RunBenchOptions } from './bench.model.js'

/**
 * Wraps `runBench` in `runScript` for convenience, so it can be run in top-level without `await`.
 */
export function runBenchScript(opt: RunBenchOptions): void {
  // fake timeout is needed to workaround `benchmark` process exiting too early when 2+ runs are used
  const timeout = setTimeout(() => {}, 10000000)
  runScript(async () => {
    await runBench(opt)
    clearTimeout(timeout)
  })
}

/**
 * Only DeferredFunctions are allowed, because of: https://github.com/bestiejs/benchmark.js/issues/111
 */
export async function runBench(opt: RunBenchOptions): Promise<HertzMap> {
  const { runs = 2, writeSummary = true, asciiPlot = true, name = 'runBench' } = opt
  const { reportDirPath = `./tmp/${name}` } = opt

  console.log(`running benchmark...\n\n`)

  const results: HertzMap[] = []

  for (const run of _range(1, runs + 1)) {
    results.push(await runBenchOnce(opt, run))
  }

  const avg: HertzMap = {}
  Object.keys(results[0]!).forEach(name => {
    let total = 0
    results.forEach(map => (total += map[name]!))
    avg[name] = total / runs
    if (avg[name] > 2) avg[name] = Math.round(avg[name])
  })

  console.log('\n\n')

  if (writeSummary) {
    // const summary: StringMap<number[]> = {}
    // names.forEach(name => {
    //   summary[name] = results.hz.map(map => map[name]!)
    // })

    fs2.ensureDir(reportDirPath)
    const summaryJsonPath = `${reportDirPath}/${name}.json`
    fs2.writeJson(summaryJsonPath, avg, { spaces: 2 })
    console.log(`saved ${dimGrey(summaryJsonPath)}`)
  }

  // Vega plots are currently disabled
  // if (writePlot) {
  //   fs2.ensureDir(reportDirPath)
  //
  //   const spec = benchResultsToVegaSpec(avg)
  //   const view = new vega.View(vega.parse(spec), { renderer: 'none' })
  //   const svg = await view.toSVG()
  //
  //   const plotPath = `${reportDirPath}/${name}.svg`
  //   fs2.writeFile(plotPath, svg)
  //   console.log(`saved ${dimGrey(plotPath)}`)
  // }

  if (asciiPlot) {
    console.log('\n' + plotAsciiChart(avg))
  }

  printComparisonTable(avg, opt.baseline)

  return avg
}

async function runBenchOnce(opt: RunBenchOptions, run: number): Promise<HertzMap> {
  const defer = pDefer<HertzMap>()

  const suite = new Benchmark.Suite()
    .on('cycle', (event: Event) => {
      // oxlint-disable-next-line @typescript-eslint/no-base-to-string
      console.log(String(event.target))
      // console.log(event.target)
    })
    .on('complete', function (this: Suite) {
      // oxlint-disable-next-line typescript/restrict-plus-operands
      console.log(`Fastest in run ${yellow(run)} is ` + this.filter('fastest').map('name'))
      // console.log(this[0].stats)
      // console.log(this)

      const results: HertzMap = {}
      this.forEach((b: Benchmark) => {
        results[(b as any).name] = b.hz
      })
      defer.resolve(results)
    })
    .on('error', (event: any) => {
      console.log('bench error:\n', event.target.error)
    })

  const fnNames = Object.keys(opt.fns || {})
  if (run % 2 === 0) fnNames.reverse()
  fnNames.forEach(name => {
    suite.add(opt.fns[name]!, {
      defer: false, // used to be true
      name,
    })
  })

  suite.run({
    // async: true,
    // defer: true,
  })

  return await defer
}

function printComparisonTable(avg: HertzMap, baselineName?: string): void {
  const names = Object.keys(avg)
  if (names.length < 2) return

  const baseline = baselineName ?? names[0]!
  const baselineHz = avg[baseline]
  if (!baselineHz) {
    console.log(red(`baseline "${baseline}" not found in results`))
    return
  }

  // Calculate column widths
  const maxNameLen = Math.max(...names.map(n => n.length))
  const maxHzLen = Math.max(...Object.values(avg).map(hz => formatNumber(hz).length))
  const maxTimeLen = Math.max(...Object.values(avg).map(hz => formatTime(hz).length))

  // Header
  console.log(`\n${grey('+ faster / - slower, ops/sec')}\n`)
  console.log(
    `  ${'name'.padEnd(maxNameLen)}  ${'time'.padStart(maxTimeLen)}  ${'ops/sec'.padStart(maxHzLen)}  diff`,
  )
  console.log(`  ${grey('─'.repeat(maxNameLen + maxHzLen + maxTimeLen + 14))}`)

  for (const name of names) {
    const hz = avg[name]!
    const paddedName = name.padEnd(maxNameLen)
    const hzStr = formatNumber(hz).padStart(maxHzLen)
    const timeStr = formatTime(hz).padStart(maxTimeLen)

    if (name === baseline) {
      console.log(`  ${paddedName}  ${timeStr}  ${hzStr}  ${grey('baseline')}`)
      continue
    }

    // Positive = more ops/sec = faster, Negative = less ops/sec = slower
    const diff = ((hz - baselineHz) / baselineHz) * 100
    const sign = diff > 0 ? '+' : ''
    const diffStr = `${sign}${diff.toFixed(1)}%`
    const colorFn = diff >= 0 ? green : red

    console.log(`  ${paddedName}  ${timeStr}  ${hzStr}  ${colorFn(diffStr)}`)
  }

  console.log()
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

function formatTime(hz: number): string {
  const seconds = 1 / hz
  if (seconds >= 1) return `${seconds.toFixed(2)} s`
  const ms = seconds * 1000
  if (ms >= 1) return `${ms.toFixed(2)} ms`
  const us = ms * 1000
  if (us >= 1) return `${us.toFixed(2)} µs`
  const ns = us * 1000
  return `${ns.toFixed(2)} ns`
}

/*
function benchResultsToVegaSpec(map: HertzMap): Spec {
  const values = Object.entries(map).map(([name, hz]) => {
    return {
      name,
      hz,
    }
  })

  // console.log(values)

  const liteSpec: TopLevelSpec = {
    // title: 'title',
    // "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
    data: {
      values,
    },
    mark: 'bar',
    encoding: {
      y: {
        field: 'name',
        type: 'ordinal',
        axis: {
          title: '',
        },
      },
      x: {
        field: 'hz',
        type: 'quantitative',
        axis: {
          title: 'ops/sec',
        },
      },
    },
  }

  const { spec } = vegaLite.compile(liteSpec)
  return spec
}
*/
