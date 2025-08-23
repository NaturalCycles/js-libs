import { runActionlint, runPrettier } from './packages/dev-lib/cfg/lint-staged.config.js'
import { prettierExtensionsAll } from './packages/dev-lib/cfg/_cnst.js'

export default {
  [`./**/*.{${prettierExtensionsAll}}`]: runPrettier,

  './.github/**/*.{yml,yaml}': runActionlint,

  // todo: biome
  // todo: eslint
}
