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
 * For the ROOT vitest.config.ts of a monorepo (Vitest `projects` mode):
 *
 * export default defineVitestMonorepoConfig({
 *   test: {
 *     projects: ['./packages/*'],
 *     // overrides here, e.g:
 *     // coverage: { enabled: false },
 *   },
 * })
 *
 * Sets the root-only options (reporters, outputFile, coverage, silent, watch,
 * slowTestThreshold, sequence.sequencer), which Vitest reads from the root config only and
 * ignores on the per-project configs (defineVitestConfig in each package).
 */
export function defineVitestMonorepoConfig(config: Partial<ViteUserConfig>): ViteUserConfig

/**
 * Pass `import.meta.dirname` as cwd if running from a monorepo.
 */
export function getSharedConfig(cwd?: string): InlineConfig

export const CollectReporter: any

export class SummaryReporter {}
