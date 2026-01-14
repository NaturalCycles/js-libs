import type { EventLoopUtilization, IntervalHistogram } from 'node:perf_hooks'
import { monitorEventLoopDelay, performance, PerformanceObserver } from 'node:perf_hooks'
import type {
  Integer,
  NonNegativeInteger,
  NumberOfMilliseconds,
  NumberOfPercent,
} from '@naturalcycles/js-lib/types'

/*
  Healthy gcCPU Ranges
  ┌────────┬──────────────────────────────────────────────┐
  │ gcCPU  │                  Assessment                  │
  ├────────┼──────────────────────────────────────────────┤
  │ < 2%   │ Excellent - well-optimized service           │
  ├────────┼──────────────────────────────────────────────┤
  │ 2-5%   │ Good - typical for most healthy services     │
  ├────────┼──────────────────────────────────────────────┤
  │ 5-10%  │ Concerning - worth investigating             │
  ├────────┼──────────────────────────────────────────────┤
  │ 10-20% │ Problematic - noticeable latency impact      │
  ├────────┼──────────────────────────────────────────────┤
  │ > 20%  │ Critical - GC thrashing, service degradation │
  └────────┴──────────────────────────────────────────────┘

 */

/**
 * Monitors EventLoopDelay.
 * Also, monitors GC performance.
 * Once per `measureInterval` sends a callback with stats.
 *
 * @experimental
 */
export class EventLoopMonitor {
  constructor(cfg: EventLoopMonitorCfg = {}) {
    const { resolution = 20, measureInterval = 60_000 } = cfg

    this.eld = monitorEventLoopDelay({ resolution })
    this.eld.enable()

    this.lastElu = performance.eventLoopUtilization()

    this.po = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        this.gcCount++
        this.gcTotalTime += entry.duration
      }
    })

    this.po.observe({ entryTypes: ['gc'] })

    this.interval = setInterval(() => {
      // Delay stats are reported in **nanoseconds**
      const { eld, gcCount, gcTotalTime } = this
      const p50 = Math.round(eld.percentile(50) / 1e6)
      const p90 = Math.round(eld.percentile(90) / 1e6)
      const p99 = Math.round(eld.percentile(99) / 1e6)
      const max = Math.round(eld.max / 1e6)
      const mean = Math.round(eld.mean / 1e6)

      const currentElu = performance.eventLoopUtilization()
      const deltaElu = performance.eventLoopUtilization(this.lastElu, currentElu)
      this.lastElu = currentElu

      const elu = Math.round(deltaElu.utilization * 100)
      const gcCPU = Math.round(gcTotalTime / measureInterval)

      this.lastStats = {
        p50,
        p90,
        p99,
        max,
        mean,
        elu,
        gcCount,
        gcTotalTime,
        gcCPU,
      }

      cfg.onStats?.(this.lastStats)

      eld.reset()
      this.gcCount = 0
      this.gcTotalTime = 0
    }, measureInterval)
  }

  private interval: NodeJS.Timeout
  private eld: IntervalHistogram
  private lastElu: EventLoopUtilization
  /**
   * Undefined until the first interval has completed.
   */
  lastStats?: EventLoopStats
  po: PerformanceObserver
  gcCount = 0
  gcTotalTime = 0

  stop(): void {
    clearInterval(this.interval)
    this.eld.disable()
    this.po.disconnect()
  }

  // cfg: Required<EventLoopMonitorCfg>
}

export interface EventLoopMonitorCfg {
  /**
   * Defaults to 20.
   */
  resolution?: NumberOfMilliseconds

  /**
   * Defaults to 60_000 ms
   */
  measureInterval?: NumberOfMilliseconds
  /**
   * Callback to be invoked with EventLoopStats.
   * Called every `measureInterval` milliseconds.
   */
  onStats?: (stats: EventLoopStats) => void
}

export interface EventLoopStats {
  p50: NumberOfMilliseconds
  p90: NumberOfMilliseconds
  p99: NumberOfMilliseconds
  max: NumberOfMilliseconds
  mean: NumberOfMilliseconds
  /**
   * EventLoopUtilization in percent.
   *
   * Calculated as:
   *   idle: <nanoseconds event loop was idle>,
   *   active: <nanoseconds event loop was busy>,
   *   utilization: active / (idle + active)
   */
  elu: NumberOfPercent
  /**
   * Number of times gc ran during the last `measureInterval`
   */
  gcCount: NonNegativeInteger
  /**
   * Total time spent on gc during the last `measureInterval`
   */
  gcTotalTime: NumberOfMilliseconds
  /**
   * CPU time spent on GC in the last `measureInterval`.
   * In "basis points", 100 basis points == 1%.
   * E.g 125 means 1.25% of CPU spent on GC.
   * It's reported in BPS to be able to do more accurate aggregate reporting
   * (aggregate this number across many instances, where rounding to 1% would be
   * too "lossy")
   */
  gcCPU: Integer
}
