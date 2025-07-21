import { _ms } from '@naturalcycles/js-lib/datetime'

export class SummaryReporter {
  constructor(cfg = {}) {
    this.cfg = cfg
  }

  onTestRunEnd(testModules) {
    const { count = 5 } = this.cfg

    let stats = []

    for (const mod of testModules) {
      const name = mod.moduleId.split('/').at(-1)
      const diag = mod.diagnostic()
      stats.push({ name, ms: diag.duration })
    }

    stats = stats.sort((a, b) => b.ms - a.ms).slice(0, count)

    console.log('   Slowest:')
    stats.forEach(({ name, ms }) => {
      console.log(String(_ms(ms)).padStart(10), name)
    })
  }
}
