import { readdirSync } from 'node:fs'
import { rolldown } from 'rolldown'
import { expect, it } from 'vitest'
import { pMap } from './promise/pMap.js'
import { srcDir } from './test/paths.js'

/**
 * Modules allowed to keep top-level code when imported (minified bytes budget).
 * Every other module must tree-shake to nothing: kept top-level code drags the whole module, and
 * everything it references, into any bundle that imports even one light export from it.
 */
const allowedResidue: Record<string, number> = {
  // decorators (__decorate calls) keep the class; it's the module's only export
  'browser/adminService.ts': 8000,
  'intl/intl.ts': 8000,
  // lookup tables filled at load time
  'qr/qr.ts': 300,
  // regexes built at load time
  'string/lodash/unicodeWords.ts': 1300,
  'string/lodash/words.ts': 150,
}

const ENTRY = '\0entry'

it('should tree-shake every module to nothing, except the allowed residue', async () => {
  const residue = await measureAllResidue()

  const overBudget = Object.fromEntries(
    Object.entries(residue).filter(([file, bytes]) => bytes > (allowedResidue[file] ?? 0)),
  )
  expect(
    overBudget,
    'These modules keep top-level code (minified bytes shown). Make it pure (e.g. /* @__PURE__ */) or, if intended, add a budget to allowedResidue.',
  ).toEqual({})

  const staleAllowances = Object.keys(allowedResidue).filter(file => !residue[file])
  expect(
    staleAllowances,
    'These modules no longer keep any code, remove them from allowedResidue.',
  ).toEqual([])
})

async function measureAllResidue(): Promise<Record<string, number>> {
  const files = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.ts') && !file.includes('.test.') && !file.endsWith('.d.ts'))
    .filter(file => !file.startsWith('test/'))
    .sort()

  const sizes = await pMap(files, file => measureResidue(file), { concurrency: 8 })
  return Object.fromEntries(files.map((file, i) => [file, sizes[i]!]))
}

/**
 * Bundles `import '<file>'` with only that file treated as side-effectful (the rest follow the
 * package's `sideEffects: false`), and returns the size of what survives.
 */
async function measureResidue(file: string): Promise<number> {
  const absPath = `${srcDir}/${file}`
  const build = await rolldown({
    input: ENTRY,
    logLevel: 'silent',
    treeshake: { moduleSideEffects: false },
    resolve: { extensionAlias: { '.js': ['.ts', '.js'] } },
    transform: { decorator: { legacy: true } },
    plugins: [
      {
        name: 'residue-entry',
        resolveId(id, importer) {
          if (id === ENTRY) return id
          if (importer === ENTRY) return { id, moduleSideEffects: true }
        },
        load(id) {
          if (id === ENTRY) return `import ${JSON.stringify(absPath)}`
        },
      },
    ],
  })
  try {
    const { output } = await build.generate({ minify: true })
    return output[0].code.trim().length
  } finally {
    await build.close()
  }
}
