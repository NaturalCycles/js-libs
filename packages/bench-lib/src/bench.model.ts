export type BenchFunction = () => any

export interface RunBenchOptions {
  /**
   * Functions to benchmark.
   * Record from function name to a `BenchFunction`.
   */
  fns: Record<string, BenchFunction>

  /**
   * Function name that is considered baseline.
   * If not defined - the first defined function is considered a baseline.
   */
  baseline?: string

  /**
   * How many times to run.
   * Every second run will be in reverse order.
   *
   * @default 2
   */
  runs?: number

  /**
   * Name of this benchmark.
   *
   * Hint: use this snippet:
   *
   * @example
   *
   * name: _substringBefore(_substringAfterLast(__filename, '/'), '.'),
   *
   * @default runBench
   */
  name?: string

  /**
   * @default ./tmp/${name}
   */
  reportDirPath?: string

  /**
   * Set false to disable writing summary file.
   * Will write to ${reportDirPath}/${name}.json
   *
   * @default true
   */
  writeSummary?: boolean

  /**
   * Will write to ${reportDirPath}/${name}.svg
   * Set to `false` to disable it.
   *
   * @default true
   */
  // writePlot?: boolean // feature disabled

  /**
   * Plot ascii chart in the terminal:)
   *
   * @experimental
   *
   * @default true
   */
  asciiPlot?: boolean
}

/**
 * results[fnName] = 100 // ops/sec, or "hertz"
 */
export type HertzMap = Record<string, number>
