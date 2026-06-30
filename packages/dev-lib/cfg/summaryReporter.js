import { _ms } from '@naturalcycles/js-lib/datetime'

export class SummaryReporter {
  constructor(cfg = {}) {
    this.cfg = cfg
  }

  onTestRunEnd(testModules) {
    const { count = 10 } = this.cfg

    let stats = []

    for (const mod of testModules) {
      // In the monorepo root run testModules span all projects, so prefix with the
      // (short) package name to disambiguate identically-named files across packages.
      const pkg = mod.project?.name?.split('/').at(-1)
      const file = mod.moduleId.split('/').at(-1)
      const name = pkg ? `${pkg} ${file}` : file
      const diag = mod.diagnostic()
      stats.push({ name, ms: diag.duration })
    }

    stats = stats.sort((a, b) => b.ms - a.ms).slice(0, count)

    console.log('   Slowest:')
    stats.forEach(({ name, ms }) => {
      console.log(_ms(ms).padStart(10), name)
    })
  }
}
