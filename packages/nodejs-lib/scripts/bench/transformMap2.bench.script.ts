/*

pn tsx scripts/bench/transformMap2.bench.script.ts

Benchmarks transformMap vs transformMap2 throughput.
Measures items/second with various configurations.

Results:

  | Test | Scenario                            | transformMap    | transformMap2  | Improvement  |
  |------|-------------------------------------|-----------------|----------------|--------------|
  | 1    | Minimal async (100k items, c=16)    | 3.2M items/sec  | 4.6M items/sec | 44.7% faster |
  | 2    | 1ms I/O delay (1k items, c=50)      | 41.5k items/sec | 43k items/sec  | 3.7% faster  |
  | 3    | High concurrency (50k items, c=100) | 3.3M items/sec  | 4.4M items/sec | 34.0% faster |
  | 4    | Sequential (10k items, c=1)         | 4.0M items/sec  | 4.1M items/sec | 1.5% faster  |

*/

import { _range } from '@naturalcycles/js-lib/array/range.js'
import { pDelay } from '@naturalcycles/js-lib/promise/pDelay.js'
import { yellow } from '../../src/colors/colors.js'
import { runScript } from '../../src/script/runScript.js'
import { Pipeline } from '../../src/stream/pipeline.js'
import { transformMap } from '../../src/stream/transform/transformMap.js'
import { transformMap2 } from '../../src/stream/transform/transformMap2.js'

interface BenchResult {
  name: string
  itemCount: number
  concurrency: number
  durationMs: number
  itemsPerSec: number
}

runScript(async () => {
  console.log('\n=== transformMap vs transformMap2 Benchmark ===\n')

  // Warmup
  console.log('Warming up...')
  await runStreamBench('warmup', 1000, 16, () => transformMap2(async n => n))
  await runStreamBench('warmup', 1000, 16, () => transformMap(async n => n))
  console.log('')

  // Test 1: Sync-like mapper (minimal async work)
  console.log('Test 1: Minimal async work (just await Promise.resolve)')
  console.log('        100,000 items, concurrency=16')
  const test1Results: BenchResult[] = []

  for (let i = 0; i < 3; i++) {
    test1Results.push(
      await runStreamBench('transformMap', 100_000, 16, () =>
        transformMap(async n => n, { concurrency: 16 }),
      ),
    )
    test1Results.push(
      await runStreamBench('transformMap2', 100_000, 16, () =>
        transformMap2(async n => n, { concurrency: 16 }),
      ),
    )
  }

  // Average results
  const avg1 = {
    transformMap: Math.round(
      test1Results.filter(r => r.name === 'transformMap').reduce((a, b) => a + b.itemsPerSec, 0) /
        3,
    ),
    transformMap2: Math.round(
      test1Results.filter(r => r.name === 'transformMap2').reduce((a, b) => a + b.itemsPerSec, 0) /
        3,
    ),
  }
  console.log(
    `  transformMap avg:   ${yellow(avg1.transformMap.toLocaleString().padStart(10))} items/sec`,
  )
  console.log(
    `  transformMap2 avg:  ${yellow(avg1.transformMap2.toLocaleString().padStart(10))} items/sec`,
  )
  console.log('')

  // Test 2: With actual async work (simulated I/O)
  console.log('Test 2: With simulated I/O (1ms delay)')
  console.log('        1,000 items, concurrency=50')
  const test2Results: BenchResult[] = []

  for (let i = 0; i < 3; i++) {
    test2Results.push(
      await runStreamBench('transformMap', 1000, 50, () =>
        transformMap(
          async n => {
            await pDelay(1)
            return n
          },
          { concurrency: 50 },
        ),
      ),
    )
    test2Results.push(
      await runStreamBench('transformMap2', 1000, 50, () =>
        transformMap2(
          async n => {
            await pDelay(1)
            return n
          },
          { concurrency: 50 },
        ),
      ),
    )
  }

  const avg2 = {
    transformMap: Math.round(
      test2Results.filter(r => r.name === 'transformMap').reduce((a, b) => a + b.itemsPerSec, 0) /
        3,
    ),
    transformMap2: Math.round(
      test2Results.filter(r => r.name === 'transformMap2').reduce((a, b) => a + b.itemsPerSec, 0) /
        3,
    ),
  }
  console.log(
    `  transformMap avg:   ${yellow(avg2.transformMap.toLocaleString().padStart(10))} items/sec`,
  )
  console.log(
    `  transformMap2 avg:  ${yellow(avg2.transformMap2.toLocaleString().padStart(10))} items/sec`,
  )
  console.log('')

  // Test 3: High concurrency stress test
  console.log('Test 3: High concurrency stress test')
  console.log('        50,000 items, concurrency=100')
  const test3Results: BenchResult[] = []

  for (let i = 0; i < 3; i++) {
    test3Results.push(
      await runStreamBench('transformMap', 50_000, 100, () =>
        transformMap(async (n: number) => n * 2, { concurrency: 100 }),
      ),
    )
    test3Results.push(
      await runStreamBench('transformMap2', 50_000, 100, () =>
        transformMap2(async (n: number) => n * 2, { concurrency: 100 }),
      ),
    )
  }

  const avg3 = {
    transformMap: Math.round(
      test3Results.filter(r => r.name === 'transformMap').reduce((a, b) => a + b.itemsPerSec, 0) /
        3,
    ),
    transformMap2: Math.round(
      test3Results.filter(r => r.name === 'transformMap2').reduce((a, b) => a + b.itemsPerSec, 0) /
        3,
    ),
  }
  console.log(
    `  transformMap avg:   ${yellow(avg3.transformMap.toLocaleString().padStart(10))} items/sec`,
  )
  console.log(
    `  transformMap2 avg:  ${yellow(avg3.transformMap2.toLocaleString().padStart(10))} items/sec`,
  )
  console.log('')

  // Test 4: Low concurrency (sequential-ish)
  console.log('Test 4: Low concurrency')
  console.log('        10,000 items, concurrency=1')
  const test4Results: BenchResult[] = []

  for (let i = 0; i < 3; i++) {
    test4Results.push(
      await runStreamBench('transformMap', 10_000, 1, () =>
        transformMap(async n => n, { concurrency: 1 }),
      ),
    )
    test4Results.push(
      await runStreamBench('transformMap2', 10_000, 1, () =>
        transformMap2(async n => n, { concurrency: 1 }),
      ),
    )
  }

  const avg4 = {
    transformMap: Math.round(
      test4Results.filter(r => r.name === 'transformMap').reduce((a, b) => a + b.itemsPerSec, 0) /
        3,
    ),
    transformMap2: Math.round(
      test4Results.filter(r => r.name === 'transformMap2').reduce((a, b) => a + b.itemsPerSec, 0) /
        3,
    ),
  }
  console.log(
    `  transformMap avg:   ${yellow(avg4.transformMap.toLocaleString().padStart(10))} items/sec`,
  )
  console.log(
    `  transformMap2 avg:  ${yellow(avg4.transformMap2.toLocaleString().padStart(10))} items/sec`,
  )
  console.log('')

  // Summary
  console.log('=== Summary ===')
  console.log('')
  console.log('Test 1 (minimal async, 100k items, c=16):')
  const diff1 = ((avg1.transformMap2 / avg1.transformMap - 1) * 100).toFixed(1)
  console.log(`  transformMap2 is ${diff1}% ${Number(diff1) > 0 ? 'faster' : 'slower'}`)

  console.log('Test 2 (1ms I/O, 1k items, c=50):')
  const diff2 = ((avg2.transformMap2 / avg2.transformMap - 1) * 100).toFixed(1)
  console.log(`  transformMap2 is ${diff2}% ${Number(diff2) > 0 ? 'faster' : 'slower'}`)

  console.log('Test 3 (high concurrency, 50k items, c=100):')
  const diff3 = ((avg3.transformMap2 / avg3.transformMap - 1) * 100).toFixed(1)
  console.log(`  transformMap2 is ${diff3}% ${Number(diff3) > 0 ? 'faster' : 'slower'}`)

  console.log('Test 4 (sequential, 10k items, c=1):')
  const diff4 = ((avg4.transformMap2 / avg4.transformMap - 1) * 100).toFixed(1)
  console.log(`  transformMap2 is ${diff4}% ${Number(diff4) > 0 ? 'faster' : 'slower'}`)

  console.log('')
})

async function runStreamBench(
  name: string,
  itemCount: number,
  concurrency: number,
  createTransform: () => ReturnType<typeof transformMap>,
): Promise<BenchResult> {
  const data = _range(1, itemCount + 1)

  const start = performance.now()

  await Pipeline.fromArray(data).transform(createTransform()).run()

  const durationMs = performance.now() - start
  const itemsPerSec = Math.round((itemCount / durationMs) * 1000)

  return { name, itemCount, concurrency, durationMs, itemsPerSec }
}
