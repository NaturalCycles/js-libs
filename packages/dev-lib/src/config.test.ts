import { expect, test } from 'vitest'
import { readDevLibConfigIfPresent } from './config.js'
import { repoDir } from './paths.js'

test('load dev-lib.config.js', async () => {
  const cfg = await readDevLibConfigIfPresent(repoDir)
  expect(cfg).toMatchInlineSnapshot(`
    {
      "commitlint": {},
    }
  `)
})
