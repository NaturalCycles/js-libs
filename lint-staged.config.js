import { prettierExtensionsAll } from './packages/dev-lib/cfg/_cnst.js'
import { runActionlint, runBiomeOxlintOxfmt } from './packages/dev-lib/cfg/lint-staged.config.js'

export default {
  [`./**/*.{${prettierExtensionsAll}}`]: runBiomeOxlintOxfmt,

  './.github/**/*.{yml,yaml}': runActionlint,
}
