import { prettierExtensionsAll } from './packages/dev-lib/cfg/_cnst.js'
import { runActionlintOxfmt, runOxlintOxfmt } from './packages/dev-lib/cfg/lint-staged.config.js'

export default {
  [`./**/*.{${prettierExtensionsAll}}`]: runOxlintOxfmt,

  './.github/**/*.{yml,yaml}': runActionlintOxfmt,
}
