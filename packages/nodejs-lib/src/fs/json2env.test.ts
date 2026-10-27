import { expect, it } from 'vitest'
import { objectToGithubActionsEnv, objectToShellExport } from './json2env.js'

it('should format objects as GitHub Actions env lines and shell exports', () => {
  expect(objectToGithubActionsEnv({})).toBe('')

  expect(
    objectToGithubActionsEnv({
      a: 'a',
      minInstances: 0,
      maxInstances: 8,
      c: false,
      d: true,
    }),
  ).toMatchInlineSnapshot(`
"a=a
minInstances=0
maxInstances=8
c=false
d=true
"
`)

  expect(
    objectToShellExport({
      a: 'a',
      minInstances: 0,
      maxInstances: 8,
      c: false,
      d: true,
    }),
  ).toMatchInlineSnapshot(`
"export a="a"
export minInstances="0"
export maxInstances="8"
export c="false"
export d="true"
"
`)
})
