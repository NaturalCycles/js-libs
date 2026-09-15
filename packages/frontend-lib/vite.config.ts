import { defineConfig } from 'vite'

/**
 * Bundles one self-contained file per feature, to be served from a CDN and loaded as
 * `<script type="module">`. Everything it uses is inlined, including js-lib.
 *
 * Consumers with their own bundler use `dist` instead, via the package exports.
 */
export default defineConfig({
  build: {
    outDir: 'bundle',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: {
        analyticsClient: 'src/analytics/index.ts',
      },
      formats: ['es'],
    },
  },
})
