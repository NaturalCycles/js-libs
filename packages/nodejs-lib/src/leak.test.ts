import { expect, it } from 'vitest'
import { exec2 } from './exec2/exec2.js'
import { srcDir } from './test/paths.cnst.js'

it('should import the main modules without keeping the process alive', () => {
  const imports = ['index.ts', 'script/runScript.ts', 'colors/colors.ts']
    .map(file => `await import('${srcDir}/${file}')`)
    .join('; ')

  // In a child process, as this worker may have the modules cached already. A timer or socket
  // left behind by an import keeps the process from exiting, so it gets killed at the timeout.
  const stdout = exec2.exec(
    `node --import tsx --input-type=module -e "${imports}; console.log('imported')"`,
    { timeout: 10_000 },
  )

  expect(stdout).toBe('imported')
})
