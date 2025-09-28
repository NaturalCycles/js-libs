import { runActionlint, runOxlintPrettier } from './packages/dev-lib/cfg/lint-staged.config.js'
import { prettierExtensionsAll } from './packages/dev-lib/cfg/_cnst.js'

export default {
  [`./**/*.{${prettierExtensionsAll}}`]: runOxlintPrettier,

  './.github/**/*.{yml,yaml}': runActionlint,

  // todo: eslint
}
