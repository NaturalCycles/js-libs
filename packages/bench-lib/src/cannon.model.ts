import type * as http from 'node:http'

export type HttpServerFactory = () => Promise<http.Server>

export interface AutocannonOptions {
  body?: string | Buffer
  method?: string // GET
  headers?: Record<any, any>
  expectBody?: string
}

export interface RunCannonNormalizedOptions extends RunCannonOptions {
  name: string
  reportDirPath: string
  runs: number
  connections: number
  pipelining: number
  duration: number
  cooldown: number
  host: string
  path: string
}

export interface RunCannonOptions {
  /**
   * @default 2
   */
  runs?: number

  connections?: number
  pipelining?: number

  /**
   * seconds
   *
   * @default 40
   */
  duration?: number

  /**
   * seconds
   *
   * @default 3
   */
  cooldown?: number
  host?: string

  /**
   * @default undefined
   */
  silent?: boolean

  /**
   * @default undefined
   */
  verbose?: boolean

  /**
   * @default true
   */
  renderResultsTable?: boolean

  /**
   * @default true
   */
  renderProgressBar?: boolean

  /**
   * @default false
   */
  renderLatencyTable?: boolean

  /**
   * Name of this benchmark.
   *
   * @default runCannon
   */
  name?: string

  /**
   * @default ./tmp/${name}
   */
  reportDirPath?: string

  /**
   * Set false to disable writing summary file.
   * Will write to ${reportDirPath}/${name}.summary.json
   *
   * @default true
   */
  writeSummary?: boolean

  /**
   * Will write to ${reportDirPath}/${name}.${plotName}.svg
   *
   * @default true
   */
  // writePlots?: boolean // feature disabled

  /**
   * Will write to ${reportDirPath}/${name}.${rawSummary}.json
   * It is a raw summary from Autocannon.
   *
   * @default true
   */
  writeRawSummary?: boolean

  /**
   * Pass true to include latency50,90,99
   *
   * @default false
   */
  includeLatencyPercentiles?: boolean

  /**
   * Text to be included in the markdown file BEFORE the plots.
   */
  beforeText?: string

  /**
   * Text to be included in the markdown file AFTER the plots.
   */
  afterText?: string

  /**
   * Will be passed to autocannon directly
   */
  autocannonOptions?: AutocannonOptions

  /**
   * Path to add to url.
   * E.g url can be http://localhost:randomPort
   *
   * path: `/hello` will turn it into:
   * http://localhost:randomPort/hello
   *
   * Should start with slash!
   *
   * @default ''
   */
  path?: string
}

export interface AutocannonSummary {
  name: string
  rpsAvg: number
  latencyAvg?: number
  latency50: number
  latency90: number
  latency99: number
  throughputAvg: number
  errors: number
  timeouts: number
  non2xx: number
  '2xx': number
}

export interface AutocannonResult {
  requests: {
    average: number
    p50: number
    [k: string]: number
  }
  latencies: string // base64-encoded histogram
  // requests: string // base64-encoded histogram
  latency: {
    average: number
    p50: number
    p90: number
    p99: number
    [k: string]: number
  }
  throughput: {
    average: number
    p50: number
    p90: number
    p99: number
    [k: string]: number
  }
  errors: number
  timeouts: number
  non2xx: number
  '2xx': number
}
