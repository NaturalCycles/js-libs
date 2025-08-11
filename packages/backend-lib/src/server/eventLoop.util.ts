import type { EventLoopUtilization, IntervalHistogram } from 'node:perf_hooks'
import { monitorEventLoopDelay, performance } from 'node:perf_hooks'
import type { NumberOfMilliseconds, NumberOfPercent } from '@naturalcycles/js-lib/types'

/**
 * @experimental
 */
export class EventLoopMonitor {
  constructor(cfg: EventLoopMonitorCfg = {}) {
    const { resolution = 20, measureInterval = 60_000 } = cfg

    this.eld = monitorEventLoopDelay({ resolution })
    this.eld.enable()

    this.lastElu = performance.eventLoopUtilization()

    this.interval = setInterval(() => {
      // Delay stats are reported in **nanoseconds**
      const { eld } = this
      const p50 = Math.round(eld.percentile(50) / 1e6)
      const p90 = Math.round(eld.percentile(90) / 1e6)
      const p99 = Math.round(eld.percentile(99) / 1e6)
      const max = Math.round(eld.max / 1e6)
      const mean = Math.round(eld.mean / 1e6)

      const currentElu = performance.eventLoopUtilization()
      const deltaElu = performance.eventLoopUtilization(this.lastElu, currentElu)
      this.lastElu = currentElu

      const elu = Math.round(deltaElu.utilization * 100)

      this.lastStats = {
        p50,
        p90,
        p99,
        max,
        mean,
        elu,
      }

      cfg.onStats?.(this.lastStats)

      eld.reset()
    }, measureInterval)
  }

  private interval: NodeJS.Timeout
  private eld: IntervalHistogram
  private lastElu: EventLoopUtilization
  /**
   * Undefined until the first interval has completed.
   */
  lastStats?: EventLoopStats

  stop(): void {
    this.interval.close()
    this.eld.disable()
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
}
