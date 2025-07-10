export class CollectReporter {
  onTestModuleEnd(testModule) {
    const shortModuleId = testModule.moduleId.split('/').at(-1)

    console.log(shortModuleId, Math.round(testModule.diagnostic().collectDuration))

    const selfTimeMap = {}
    const totalTimeMap = {}

    Object.entries(testModule.diagnostic().importDurations).forEach(([k, v]) => {
      const short = k.split('/').at(-3) + '/' + k.split('/').at(-2) + '/' + k.split('/').at(-1)
      // if (Math.round(v.totalTime) < 5) return // skip <0.5ms imports
      selfTimeMap[short] = Math.round(v.selfTime)
      totalTimeMap[short] = Math.round(v.totalTime)
    })

    const sortedSelfTimeMap = Object.fromEntries(
      Object.entries(selfTimeMap).sort((a, b) => b[1] - a[1]),
    )
    const sortedTotalTimeMap = Object.fromEntries(
      Object.entries(totalTimeMap).sort((a, b) => b[1] - a[1]),
    )

    console.log({ sortedSelfTimeMap })
    console.log({ sortedTotalTimeMap })
  }
  // onTestRunEnd() {
  //   console.log('Test run ended')
  // }
}
