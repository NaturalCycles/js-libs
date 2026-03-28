import { defineOxfmtConfig } from '@naturalcycles/dev-lib/cfg/oxfmt.config.js'

export default defineOxfmtConfig({
  ignorePatterns: [
    'docs',
    'packages/bench-lib/demo/*.md',
    'packages/js-lib/src/browser/analytics.util.ts',
  ],
})
