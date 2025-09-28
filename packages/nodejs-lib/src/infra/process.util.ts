import os from 'node:os'
import { _mb } from '@naturalcycles/js-lib'

export function memoryUsage(): {
  rss: number
  heapTotal: number
  heapUsed: number
  external: number
} {
  const { rss, external, heapUsed, heapTotal } = process.memoryUsage()
  return {
    rss: _mb(rss),
    heapTotal: _mb(heapTotal),
    heapUsed: _mb(heapUsed),
    external: _mb(external),
  }
}

export function memoryUsageFull(): {
  rss: number
  heapTotal: number
  heapUsed: number
  external: number
  totalMem: number
  freeMem: number
  usedMem: number
} {
  const { rss, external, heapUsed, heapTotal } = process.memoryUsage()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  return {
    rss: _mb(rss),
    heapTotal: _mb(heapTotal),
    heapUsed: _mb(heapUsed),
    external: _mb(external),
    totalMem: _mb(totalMem),
    freeMem: _mb(freeMem),
    usedMem: _mb(totalMem - freeMem),
  }
}

class ProcessUtil {
  private timer!: NodeJS.Timeout

  startMemoryTimer(intervalMillis = 1000): void {
    console.log(memoryUsage())

    this.timer = setInterval(() => {
      console.log(memoryUsage())
    }, intervalMillis)
  }

  stopMemoryTimer(afterMillis = 0): void {
    setTimeout(() => clearInterval(this.timer), afterMillis)
  }

  cpuAvg(): { avg1: string; avg5: string; avg15: string } {
    const avg = os.loadavg()
    return {
      avg1: avg[0]!.toFixed(2),
      avg5: avg[1]!.toFixed(2),
      avg15: avg[2]!.toFixed(2),
    }
  }

  cpuInfo(): { count: number; model: string; speed: number } {
    const c = os.cpus()[0]!
    return {
      count: os.cpus().length,
      model: c.model,
      speed: c.speed,
    }
  }

  async cpuPercent(ms: number): Promise<number> {
    const stats1 = this.getCPUInfo()
    const startIdle = stats1.idle
    const startTotal = stats1.total

    return await new Promise<number>(resolve => {
      setTimeout(() => {
        const stats2 = this.getCPUInfo()
        const endIdle = stats2.idle
        const endTotal = stats2.total

        const idle = endIdle - startIdle
        const total = endTotal - startTotal
        const perc = idle / total

        resolve(Math.round((1 - perc) * 100))
      }, ms)
    })
  }

  private getCPUInfo(): {
    idle: number
    total: number
  } {
    // oxlint-disable-next-line unicorn/no-array-reduce
    return os.cpus().reduce(
      (r, cpu) => {
        r['idle'] += cpu.times.idle
        Object.values(cpu.times).forEach(m => (r['total'] += m))
        return r
      },
      {
        idle: 0,
        total: 0,
      },
    )
  }
}

export const processSharedUtil = new ProcessUtil()
