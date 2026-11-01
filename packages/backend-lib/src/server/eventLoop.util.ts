import type {
  ELDHistogram,
  EventLoopMonitorOptions,
  EventLoopUtilization,
  PerformanceEntry,
} from 'node:perf_hooks'
import { constants, monitorEventLoopDelay, performance, PerformanceObserver } from 'node:perf_hooks'
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
 * On Node >=24.19 (or >=26.5) delays are sampled once per event loop iteration
 * (`samplePerIteration`), so stats reflect true per-iteration delay:
 * expect p50/mean near 0 on a healthy service, instead of the ~`resolution` baseline
 * reported by older interval-based sampling.
 *
 * Beware of CPU-throttled processes (e.g. idle CloudRun instances with request-based billing):
 * the time the process spent runnable-but-unscheduled is recorded as event loop delay,
 * and the interval timer fires late (see `intervalMs`).
 * Use `pause()` / `resume()` to keep such periods out of the delay samples,
 * e.g. pause when the last in-flight request finishes and resume when the next one arrives.
 *
 * Besides the delay histogram, a watchdog timer measures the largest stall of each interval
 * together with the CPU the event loop thread consumed across it (`stallMs` / `stallCpuMs`),
 * which tells a stall caused by own work (sync code, GC) from one caused by the thread not
 * being scheduled.
 * The longest single GC pause is reported too (`gcMaxTime` / `gcMaxKind`).
 */
export class EventLoopMonitor {
  constructor(cfg: EventLoopMonitorCfg = {}) {
    const { measureInterval = 60_000, watchdogInterval = 1000 } = cfg
    this.watchdogInterval = watchdogInterval

    const eldOptions: EventLoopMonitorOptions = {
      // Node >=24.19 / >=26.5: sample once per event loop iteration (uv_prepare/uv_check hooks),
      // which measures actual per-iteration delay instead of timer jitter.
      // More accurate (no `resolution` offset baked into every percentile) and cheaper.
      // Older Node silently ignores this option and falls back to interval-based sampling.
      samplePerIteration: true,
    }
    this.eld = monitorEventLoopDelay(eldOptions)
    this.eld.enable()

    this.lastElu = performance.eventLoopUtilization()
    this.lastReportedAt = performance.now()

    this.po = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        this.gcCount++
        this.gcTotalTime += entry.duration
        if (entry.duration > this.gcMaxTime) {
          this.gcMaxTime = entry.duration
          this.gcMaxKind = getGcKind(entry)
        }
      }
    })

    this.po.observe({ entryTypes: ['gc'] })

    this.startWatchdog()

    this.interval = setInterval(() => {
      // Delay stats are reported in **nanoseconds**
      const { eld, gcCount, gcTotalTime, gcMaxKind } = this
      const p50 = Math.round(eld.percentile(50) / 1e6)
      const p90 = Math.round(eld.percentile(90) / 1e6)
      const p99 = Math.round(eld.percentile(99) / 1e6)
      const max = Math.round(eld.max / 1e6)
      const mean = Math.round(eld.mean / 1e6)

      // Actual wall-clock length of this interval, as opposed to the nominal `measureInterval`.
      // Timers fire late when the process is starved of CPU, so this can be much longer.
      // Floored at 1 to never divide by zero (only reachable with fake timers).
      const now = performance.now()
      const intervalMs = Math.max(1, Math.round(now - this.lastReportedAt))
      this.lastReportedAt = now

      const currentElu = performance.eventLoopUtilization()
      const deltaElu = performance.eventLoopUtilization(this.lastElu, currentElu)
      this.lastElu = currentElu

      const elu = Math.round(deltaElu.utilization * 100)
      const gcCPU = Math.round((gcTotalTime / intervalMs) * 10_000)
      const gcMaxTime = Math.round(this.gcMaxTime)
      const stallMs = Math.round(this.maxStallMs)
      const stallCpuMs = Math.round(this.maxStallCpuMs)

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
        gcMaxTime,
        gcMaxKind,
        stallMs,
        stallCpuMs,
        intervalMs,
      }

      cfg.onStats?.(this.lastStats)

      eld.reset()
      this.gcCount = 0
      this.gcTotalTime = 0
      this.gcMaxTime = 0
      this.gcMaxKind = undefined
      this.maxStallMs = 0
      this.maxStallCpuMs = 0
    }, measureInterval)
  }

  private interval: NodeJS.Timeout
  private eld: ELDHistogram
  private lastElu: EventLoopUtilization
  private lastReportedAt: NumberOfMilliseconds
  private paused = false
  private readonly watchdogInterval: NumberOfMilliseconds
  private watchdog?: NodeJS.Timeout
  /**
   * performance.now() and process CPU (microseconds) at the last watchdog tick.
   */
  private watchdogAt = 0
  private watchdogCpuUs = 0
  private maxStallMs = 0
  private maxStallCpuMs = 0
  private gcMaxTime = 0
  private gcMaxKind?: GcKind
  /**
   * Undefined until the first interval has completed.
   */
  lastStats?: EventLoopStats
  po: PerformanceObserver
  gcCount = 0
  gcTotalTime = 0

  stop(): void {
    clearInterval(this.interval)
    this.stopWatchdog()
    this.eld.disable()
    this.po.disconnect()
  }

  /**
   * Stops sampling event loop delay (and the stall watchdog) until `resume()` is called.
   * GC and ELU keep being tracked, and the samples recorded so far are kept.
   *
   * Meant for periods when the process is known to be CPU-throttled, e.g. a CloudRun instance
   * (request-based billing) with no request in flight: a delay recorded there measures
   * the throttling, not the application.
   */
  pause(): void {
    this.paused = true
    this.eld.disable()
    this.stopWatchdog()
  }

  /**
   * Resumes sampling event loop delay after `pause()`.
   * Safe to call from within the event that ended the throttled period (e.g. the middleware of
   * the request that woke the instance): the histogram and the watchdog restart their clocks
   * from this moment, so the stall that preceded it in the same loop iteration is not sampled.
   */
  resume(): void {
    if (!this.paused) return
    this.paused = false
    this.eld.enable()
    this.startWatchdog()
  }

  private startWatchdog(): void {
    this.watchdogAt = performance.now()
    this.watchdogCpuUs = getCpuUs()
    this.watchdog = setInterval(() => this.onWatchdogTick(), this.watchdogInterval)
    // Must not keep the process alive on its own (the main interval already does, until `stop()`)
    this.watchdog.unref()
  }

  private stopWatchdog(): void {
    clearInterval(this.watchdog)
    this.watchdog = undefined
  }

  /**
   * A tick that fires late means the loop could not turn in between: a long synchronous callback,
   * a long GC pause, or the process not being scheduled at all. The CPU consumed across the gap
   * tells these apart. Node reschedules a late interval from the actual fire time, so one stall
   * produces exactly one late tick.
   */
  private onWatchdogTick(): void {
    const now = performance.now()
    const cpuUs = getCpuUs()
    const stallMs = now - this.watchdogAt - this.watchdogInterval
    if (stallMs > this.maxStallMs) {
      this.maxStallMs = stallMs
      this.maxStallCpuMs = (cpuUs - this.watchdogCpuUs) / 1000
    }
    this.watchdogAt = now
    this.watchdogCpuUs = cpuUs
  }

  // cfg: Required<EventLoopMonitorCfg>
}

function getGcKind(entry: PerformanceEntry): GcKind {
  // `detail` is only declared on Node's PerformanceNodeEntry type, which getEntries() doesn't return
  const kind = (entry as { detail?: { kind?: number } }).detail?.kind
  if (kind === constants.NODE_PERFORMANCE_GC_MAJOR) return 'major'
  if (kind === constants.NODE_PERFORMANCE_GC_MINOR) return 'minor'
  if (kind === constants.NODE_PERFORMANCE_GC_INCREMENTAL) return 'incremental'
  if (kind === constants.NODE_PERFORMANCE_GC_WEAKCB) return 'weakcb'
  return 'unknown'
}

/**
 * CPU time of the current (event loop) thread in microseconds, so that worker threads,
 * the libuv threadpool and parallel GC helpers don't count.
 */
function getCpuUs(): number {
  const { user, system } = process.threadCpuUsage()
  return user + system
}

export type GcKind = 'major' | 'minor' | 'incremental' | 'weakcb' | 'unknown'

export interface EventLoopMonitorCfg {
  /**
   * Defaults to 60_000 ms
   */
  measureInterval?: NumberOfMilliseconds
  /**
   * Period of the stall watchdog timer, see `EventLoopStats.stallMs`.
   * Defaults to 1000 ms.
   */
  watchdogInterval?: NumberOfMilliseconds
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
   * Number of times gc ran during the last interval
   */
  gcCount: NonNegativeInteger
  /**
   * Total time spent on gc during the last interval
   */
  gcTotalTime: NumberOfMilliseconds
  /**
   * CPU time spent on GC in the last interval, relative to `intervalMs`.
   * In "basis points", 100 basis points == 1%.
   * E.g 125 means 1.25% of CPU spent on GC.
   * It's reported in BPS to be able to do more accurate aggregate reporting
   * (aggregate this number across many instances, where rounding to 1% would be
   * too "lossy")
   */
  gcCPU: Integer
  /**
   * Longest single GC pause in the last interval.
   */
  gcMaxTime: NumberOfMilliseconds
  /**
   * Kind of the longest GC pause. Undefined when no GC ran in the interval.
   */
  gcMaxKind: GcKind | undefined
  /**
   * Largest stall of the interval, as seen by the watchdog timer: how late its tick fired,
   * 0 when every tick was on time. Covers anything that kept the loop from turning:
   * a long synchronous callback, a long GC pause, or the process not being scheduled at all.
   * Underestimates the stall by up to `watchdogInterval` (the tick may have been due anywhere
   * within its period when the stall began). Not measured while paused.
   */
  stallMs: NumberOfMilliseconds
  /**
   * CPU time of the event loop thread consumed between the watchdog tick before the largest
   * stall and the late tick that measured it.
   * Close to `stallMs` means the thread was running (own code or GC, see `gcMaxTime`),
   * close to 0 means it was not scheduled (platform pause, CPU throttling).
   */
  stallCpuMs: NumberOfMilliseconds
  /**
   * Actual wall-clock duration of the interval covered by these stats.
   * Normally equals `measureInterval`, but is longer when the timer fired late,
   * e.g. on a CloudRun instance that was CPU-throttled while idle (request-based billing).
   * An interval much longer than `measureInterval` means the delay stats are dominated
   * by that throttling rather than by the application.
   */
  intervalMs: NumberOfMilliseconds
}
