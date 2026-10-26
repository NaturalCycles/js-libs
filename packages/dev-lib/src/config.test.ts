import { expect, it } from 'vitest'
import { readDevLibConfigIfPresent } from './config.js'
import { repoDir } from './paths.js'

it('load dev-lib.config.js', async () => {
  const cfg = await readDevLibConfigIfPresent(repoDir)
  expect(cfg).toMatchInlineSnapshot(`
    {
      "commitlint": {},
    }
  `)
})
