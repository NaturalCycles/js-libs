import { _range, pDefer } from '@naturalcycles/js-lib'
import { dimGrey, runScript, yellow } from '@naturalcycles/nodejs-lib'
import { fs2 } from '@naturalcycles/nodejs-lib/fs'
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

  return avg
}

async function runBenchOnce(opt: RunBenchOptions, run: number): Promise<HertzMap> {
  const defer = pDefer<HertzMap>()

  const suite = new Benchmark.Suite()
    .on('cycle', (event: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      console.log(String(event.target))
      // console.log(event.target)
    })
    .on('complete', function (this: Suite) {
      console.log(`Fastest in run ${yellow(run)} is ` + this.filter('fastest').map('name' as any))
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
