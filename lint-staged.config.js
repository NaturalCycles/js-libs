import { prettierExtensionsAll } from './packages/dev-lib/cfg/_cnst.js'
import {
  runActionlintOxfmt,
  runBiomeOxlintOxfmt,
} from './packages/dev-lib/cfg/lint-staged.config.js'

export default {
  [`./**/*.{${prettierExtensionsAll}}`]: runBiomeOxlintOxfmt,

  './.github/**/*.{yml,yaml}': runActionlintOxfmt,
}
