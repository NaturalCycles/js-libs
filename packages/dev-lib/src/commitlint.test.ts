import { expect, test } from 'vitest'
import { validateCommitMessage } from './commitlint.js'

// Valid messages
test('valid: simple message', () => {
  const result = validateCommitMessage('feat: add login')
  expect(result.valid).toBe(true)
  expect(result.errors).toEqual([])
})

test('valid: message with scope', () => {
  const result = validateCommitMessage('fix(auth): resolve crash')
  expect(result.valid).toBe(true)
})

test('valid: breaking change indicator', () => {
  const result = validateCommitMessage('feat!: breaking change')
  expect(result.valid).toBe(true)
})

test('valid: breaking change with scope', () => {
  const result = validateCommitMessage('feat(api)!: breaking change')
  expect(result.valid).toBe(true)
})

test('valid: message with body', () => {
  const msg = `feat: add feature

This is the body with more details.
Multiple lines are allowed.`
  const result = validateCommitMessage(msg)
  expect(result.valid).toBe(true)
})

test('valid: all allowed types', () => {
  const types = [
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
  ]
  for (const type of types) {
    const result = validateCommitMessage(`${type}: some description`)
    expect(result.valid, `type "${type}" should be valid`).toBe(true)
  }
})

// Invalid messages
test('invalid: empty message', () => {
  const result = validateCommitMessage('')
  expect(result.valid).toBe(false)
  expect(result.errors).toContain('Commit message is empty')
})

test('invalid: whitespace only', () => {
  const result = validateCommitMessage('   \n\n  ')
  expect(result.valid).toBe(false)
  expect(result.errors).toContain('Commit message is empty')
})

test('invalid: no colon', () => {
  const result = validateCommitMessage('feat add login')
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('must match format')
})

test('invalid: missing description', () => {
  const result = validateCommitMessage('feat:')
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('must match format')
})

test('invalid: description is only whitespace', () => {
  const result = validateCommitMessage('feat:   ')
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('must match format')
})

test('invalid: unknown type', () => {
  const result = validateCommitMessage('unknown: some description')
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('Invalid type "unknown"')
  expect(result.errors[0]).toContain('Allowed types:')
})

test('invalid: subject line too long', () => {
  const longDesc = 'a'.repeat(120)
  const result = validateCommitMessage(`feat: ${longDesc}`)
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('Subject line too long')
})

test('invalid: missing blank line before body', () => {
  const msg = `feat: add feature
This body starts immediately without blank line.`
  const result = validateCommitMessage(msg)
  expect(result.valid).toBe(false)
  expect(result.errors).toContain('There must be a blank line between subject and body')
})

// Scope validation with config
test('config: requireScope enforced', () => {
  const result = validateCommitMessage('feat: no scope', { requireScope: true })
  expect(result.valid).toBe(false)
  expect(result.errors).toContain('Scope is required')
})

test('config: requireScope satisfied', () => {
  const result = validateCommitMessage('feat(api): has scope', { requireScope: true })
  expect(result.valid).toBe(true)
})

test('config: allowedScopes enforced', () => {
  const result = validateCommitMessage('feat(invalid): wrong scope', {
    allowedScopes: ['api', 'ui', 'core'],
  })
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('Scope must be one of the allowed scopes')
})

test('config: allowedScopes satisfied', () => {
  const result = validateCommitMessage('feat(api): valid scope', {
    allowedScopes: ['api', 'ui', 'core'],
  })
  expect(result.valid).toBe(true)
})

test('config: empty scope passes allowedScopes', () => {
  const result = validateCommitMessage('feat: no scope is fine', {
    allowedScopes: ['api', 'ui', 'core'],
  })
  expect(result.valid).toBe(true)
})

test('config: requireScope + allowedScopes combined', () => {
  // Missing scope fails requireScope
  const r1 = validateCommitMessage('feat: no scope', {
    requireScope: true,
    allowedScopes: ['api', 'ui'],
  })
  expect(r1.valid).toBe(false)
  expect(r1.errors).toContain('Scope is required')

  // Wrong scope fails allowedScopes
  const r2 = validateCommitMessage('feat(wrong): bad scope', {
    requireScope: true,
    allowedScopes: ['api', 'ui'],
  })
  expect(r2.valid).toBe(false)
  expect(r2.errors[0]).toContain('Scope must be one of the allowed scopes')

  // Valid scope passes both
  const r3 = validateCommitMessage('feat(api): correct', {
    requireScope: true,
    allowedScopes: ['api', 'ui'],
  })
  expect(r3.valid).toBe(true)
})
