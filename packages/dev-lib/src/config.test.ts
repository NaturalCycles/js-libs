import { expect, it } from 'vitest'
import { readDevLibConfigIfPresent } from './config.js'
import { repoDir } from './paths.js'

it('should read the dev-lib config of the repo', async () => {
  const cfg = await readDevLibConfigIfPresent(repoDir)
  expect(cfg).toMatchInlineSnapshot(`
    {
      "commitlint": {},
    }
  `)
})
