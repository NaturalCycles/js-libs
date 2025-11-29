import { runActionlint, runBiomeOxlintPrettier } from './packages/dev-lib/cfg/lint-staged.config.js'
import { prettierExtensionsAll } from './packages/dev-lib/cfg/_cnst.js'

export default {
  [`./**/*.{${prettierExtensionsAll}}`]: runBiomeOxlintPrettier,

  './.github/**/*.{yml,yaml}': runActionlint,

  // todo: eslint
}
