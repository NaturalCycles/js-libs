import { _last } from '@naturalcycles/js-lib/array/array.util.js'

export class CollectReporter {
  constructor(cfg = {}) {
    this.cfg = cfg
  }

  onTestModuleEnd(testModule) {
    const { threshold = 0 } = this.cfg
    const shortModuleId = _last(testModule.moduleId.split('/'))

    const selfTimeMap = {}
    const totalTimeMap = {}
    let moduleCount = 0
    let selfSum = 0

    Object.entries(testModule.diagnostic().importDurations).forEach(([k, v]) => {
      moduleCount++
      selfSum += v.selfTime
      const short = k.split('/').slice(-3).join('/')
      if (Math.round(v.totalTime) < threshold) return // skip < ${threshold} ms imports
      selfTimeMap[short] = Math.round(v.selfTime)
      totalTimeMap[short] = Math.round(v.totalTime)
    })

    const sortedSelfTimeMap = Object.fromEntries(
      Object.entries(selfTimeMap).sort((a, b) => b[1] - a[1]),
    )
    const sortedTotalTimeMap = Object.fromEntries(
      Object.entries(totalTimeMap).sort((a, b) => b[1] - a[1]),
    )

    console.log(shortModuleId, {
      moduleCount,
      selfSum: Math.round(selfSum),
      collectDuration: Math.round(testModule.diagnostic().collectDuration),
    })
    console.log({ sortedSelfTimeMap })
    console.log({ sortedTotalTimeMap })
  }
  // onTestRunEnd() {
  //   console.log('Test run ended')
  // }
}
