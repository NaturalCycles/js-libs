export class CollectReporter {
  constructor(cfg = {}) { this.cfg = cfg }

  onTestModuleEnd(testModule) {
    const { threshold = 0 } = this.cfg
    const shortModuleId = testModule.moduleId.split('/').at(-1)

    const selfTimeMap = {}
    const totalTimeMap = {}
    let moduleCount = 0
    let selfSum = 0

    Object.entries(testModule.diagnostic().importDurations).forEach(([k, v]) => {
      moduleCount++
      selfSum += v.selfTime
      const short = k.split('/').at(-3) + '/' + k.split('/').at(-2) + '/' + k.split('/').at(-1)
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
