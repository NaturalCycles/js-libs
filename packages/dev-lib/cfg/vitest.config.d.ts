import type { ViteUserConfig } from 'vitest/config'
import type { InlineConfig } from 'vitest/node'

/**

 Usage example:

 export default defineVitestConfig({
   // overrides here, e.g:
   // bail: 1,
 })

 */
export function defineVitestConfig(config?: Partial<ViteUserConfig>, cwd?: string): ViteUserConfig

export const sharedConfig: InlineConfig

export const CollectReporter: any
export const SummaryReporter: any
