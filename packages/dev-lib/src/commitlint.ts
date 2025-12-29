import { _assert } from '@naturalcycles/js-lib/error'
import { fs2 } from '@naturalcycles/nodejs-lib/fs2'
import { type DevLibCommitlintConfig, readDevLibConfigIfPresent } from './config.js'

const ALLOWED_TYPES = new Set([
  'feat',
  'fix',
  'chore',
  'refactor',
  'docs',
  'style',
  'test',
  'perf',
  'ci',
  'build',
  'revert',
])

const SUBJECT_MAX_LENGTH = 120 // Only applies to subject line (first line)

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

/**
 * Commit message validator following Conventional Commits specification.
 * https://www.conventionalcommits.org/
 */
export function validateCommitMessage(
  input: string,
  cfg: DevLibCommitlintConfig = {},
): CommitMessageValidationResponse {
  const errors: string[] = []

  const msg = input.trim()
  if (!msg) {
    return { valid: false, errors: ['Commit message is empty'] }
  }

  const lines = msg.split('\n')
  const subjectLine = lines[0]!

  // Step 1: Validate subject line format
  // Pattern: type(scope)!: description  OR  type!: description  OR  type(scope): description  OR  type: description
  const subjectPattern = /^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/
  const match = subjectLine.match(subjectPattern)

  if (!match) {
    errors.push(
      `Subject line must match format: type(scope): description\n` +
        `  Got: "${subjectLine}"\n` +
        `  Examples: "feat(auth): add login", "fix: resolve crash"`,
    )
    return { valid: false, errors }
  }

  const [, type, scope, _breaking, description] = match

  // Step 2: Validate type
  if (!ALLOWED_TYPES.has(type!)) {
    errors.push(`Invalid type "${type}". Allowed types: ${[...ALLOWED_TYPES].join(', ')}`)
  }

  // Step 3: Validate subject line length
  if (subjectLine.length > SUBJECT_MAX_LENGTH) {
    errors.push(`Subject line too long: ${subjectLine.length} chars (max ${SUBJECT_MAX_LENGTH})`)
  }

  // Step 4: Validate description is not empty
  if (!description?.trim()) {
    errors.push('Description after colon cannot be empty')
  }

  // Step 5: Validate description doesn't start with capital letter (conventional style)
  // Disabled: many existing commits use capitals
  // if (description && /^[A-Z]/.test(description.trim())) {
  //   errors.push('Description should start with lowercase letter')
  // }

  // Step 6: Validate blank line between subject and body (if body exists)
  if (lines.length > 1 && lines[1]!.trim() !== '') {
    errors.push('There must be a blank line between subject and body')
  }

  // Note: No line length validation for body lines - they can be any length

  // Step 7: scope validation
  if (cfg.requireScope && !scope) {
    errors.push('Scope is required')
  }

  if (scope && cfg.allowedScopes && !cfg.allowedScopes.includes(scope)) {
    errors.push(`Scope must be one of the allowed scopes:\n${cfg.allowedScopes.join('\n')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    // parsed: {
    //   type,
    //   scope: scope || null,
    //   breaking: !!breaking,
    //   description: description?.trim(),
    //   body: lines.slice(2).join('\n').trim() || null,
    // },
  }
}

export interface CommitMessageValidationResponse {
  valid: boolean
  errors: string[]
}
