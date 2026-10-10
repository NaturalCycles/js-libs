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

/**
 * @deprecated Use defineVitestMonorepoConfig for the monorepo root config instead. It sets
 * `reporters` together with all the other root-only options.
 */
export function getRootReporters(): InlineConfig['reporters']

/**
 * @deprecated Use defineVitestMonorepoConfig for the monorepo root config instead. It sets
 * `outputFile` together with all the other root-only options.
 */
export function getRootOutputFile(): InlineConfig['outputFile']

/**
 * @deprecated Use defineVitestMonorepoConfig for the monorepo root config instead. It sets
 * `coverage` together with all the other root-only options.
 */
export function getRootCoverage(): InlineConfig['coverage']

export const CollectReporter: any

export class SummaryReporter {}
