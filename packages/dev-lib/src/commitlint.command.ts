import { _assert } from '@naturalcycles/js-lib/error'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { validateCommitMessage } from './commitlint.util.js'
import { readDevLibConfigIfPresent } from './config.js'

/**
 * Validates the commit message,
 * which is read from a file, passed as process.argv.at(-1)
 */
export async function runCommitlint(): Promise<void> {
  //  || '.git/COMMIT_EDITMSG' // fallback is unnecessary, first argument should be always present
  const arg1 = process.argv.at(-1)
  _assert(arg1, 'dev-lib commitlint2 is called with $1 (first argument) missing')
  console.log({ arg1 })

  fs2.requireFileToExist(arg1)
  const msg = fs2.readText(arg1)
  console.log({ msg })

  // Skip validation for merge commits (MERGE_HEAD exists during merge)
  if (fs2.pathExists('.git/MERGE_HEAD')) {
    console.log('✓ Merge commit - skipping validation')
    return
  }

  const devLibCfg = await readDevLibConfigIfPresent()
  console.log({ devLibCfg })

  const { valid, errors } = validateCommitMessage(msg, devLibCfg.commitlint)

  if (valid) {
    console.log('✓ Valid commit message')
    return
  }

  console.error('✗ Invalid commit message:')
  for (const err of errors) {
    console.error(`  - ${err}`)
  }
  process.exit(1)
}
