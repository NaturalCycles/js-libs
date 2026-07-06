import { expect, test } from 'vitest'
import { parseCommit } from './commit.util.js'
import { generateReleaseNotes } from './notes.util.js'
import type { RepoInfo } from './release.model.js'

const repo: RepoInfo = {
  owner: 'NaturalCycles',
  repo: 'js-libs',
  url: 'https://github.com/NaturalCycles/js-libs',
}

test('generateReleaseNotes: full example', () => {
  const commits = [
    { hash: 'a'.repeat(40), subject: 'feat(array): add _chunk', body: '' },
    { hash: 'b'.repeat(40), subject: 'fix: resolve crash', body: '' },
    { hash: 'c'.repeat(40), subject: 'perf(sort): faster comparator', body: '' },
    { hash: 'd'.repeat(40), subject: 'chore: deps', body: '' }, // excluded from notes
    {
      hash: 'e'.repeat(40),
      subject: 'feat(api)!: new api',
      body: 'BREAKING CHANGE: old api removed',
    },
  ].map(parseCommit)

  const notes = generateReleaseNotes({
    repo,
    commits,
    lastTag: '@naturalcycles/js-lib-v15.80.0',
    nextTag: '@naturalcycles/js-lib-v16.0.0',
    date: '2026-07-06',
  })

  expect(notes)
    .toBe(`## [@naturalcycles/js-lib-v16.0.0](https://github.com/NaturalCycles/js-libs/compare/@naturalcycles/js-lib-v15.80.0...@naturalcycles/js-lib-v16.0.0) (2026-07-06)

### Features

* **array:** add _chunk ([aaaaaaa](https://github.com/NaturalCycles/js-libs/commit/${'a'.repeat(40)}))
* **api:** new api ([eeeeeee](https://github.com/NaturalCycles/js-libs/commit/${'e'.repeat(40)}))

### Bug Fixes

* resolve crash ([bbbbbbb](https://github.com/NaturalCycles/js-libs/commit/${'b'.repeat(40)}))

### Performance Improvements

* **sort:** faster comparator ([ccccccc](https://github.com/NaturalCycles/js-libs/commit/${'c'.repeat(40)}))

### ⚠ BREAKING CHANGES

* **api:** old api removed
`)
})

test('generateReleaseNotes: first release has no compare link', () => {
  const commits = [{ hash: 'a'.repeat(40), subject: 'feat: initial', body: '' }].map(parseCommit)
  const notes = generateReleaseNotes({ repo, commits, nextTag: 'v1.0.0', date: '2026-07-06' })
  expect(notes.startsWith('## v1.0.0 (2026-07-06)')).toBe(true)
})

test('generateReleaseNotes: revert section', () => {
  const commits = [{ hash: 'a'.repeat(40), subject: 'Revert "feat: broken thing"', body: '' }].map(
    parseCommit,
  )
  const notes = generateReleaseNotes({ repo, commits, nextTag: 'v1.0.1', date: '2026-07-06' })
  expect(notes).toContain('### Reverts')
  expect(notes).toContain('Revert "feat: broken thing"')
})
