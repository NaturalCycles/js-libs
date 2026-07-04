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

/**
 * Reporters for the monorepo root config (Vitest `projects` mode), where
 * `reporters` is a root-only option. Returns the compact 'agent' reporter for
 * agents, otherwise the default reporters plus a monorepo-wide SummaryReporter.
 */
export function getRootReporters(): InlineConfig['reporters']

/**
 * `outputFile` for the junit/json reporters at the monorepo root config (Vitest
 * `projects` mode), where `outputFile` is a root-only option. Pair it with
 * getRootReporters so the junit/json report is written in the aggregate root run.
 */
export function getRootOutputFile(): InlineConfig['outputFile']

/**
 * `coverage` for the monorepo root config (Vitest `projects` mode), where
 * `coverage` is a root-only option. Without it on the root config no coverage
 * report is produced when running via `projects`. Produces a single unified
 * report spanning all projects.
 */
export function getRootCoverage(): InlineConfig['coverage']

export const CollectReporter: any

export class SummaryReporter {}
