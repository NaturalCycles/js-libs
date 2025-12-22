import type { ViteUserConfig } from 'vitest/config'
import type { InlineConfig } from 'vitest/node'

/**

 Usage example:

 export default defineVitestConfig({
   // overrides here, e.g:
   // bail: 1,
 })

 Pass `import.meta.dirname` as cwd if running from a monorepo.

 */
export function defineVitestConfig(config?: Partial<ViteUserConfig>, cwd?: string): ViteUserConfig

/**
 * Pass `import.meta.dirname` as cwd if running from a monorepo.
 */
export function getSharedConfig(cwd?: string): InlineConfig

export const CollectReporter: any
export const SummaryReporter: any
