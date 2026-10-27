import { expect, it } from 'vitest'
import { validateCommitMessage } from './commitlint.util.js'

// Valid messages
it('should accept a simple message', () => {
  const result = validateCommitMessage('feat: add login')
  expect(result.valid).toBe(true)
  expect(result.errors).toEqual([])
})

it('should accept a message with a scope', () => {
  const result = validateCommitMessage('fix(auth): resolve crash')
  expect(result.valid).toBe(true)
})

it('should accept a breaking change indicator', () => {
  const result = validateCommitMessage('feat!: breaking change')
  expect(result.valid).toBe(true)
})

it('should accept a breaking change indicator with a scope', () => {
  const result = validateCommitMessage('feat(api)!: breaking change')
  expect(result.valid).toBe(true)
})

it('should accept a merge commit', () => {
  const result = validateCommitMessage("Merge branch 'feature' into main")
  expect(result.valid).toBe(true)
  expect(result.errors).toEqual([])
})

it('should accept a pull request merge commit', () => {
  const result = validateCommitMessage('Merge pull request #123 from user/branch')
  expect(result.valid).toBe(true)
})

it('should accept a message with a body', () => {
  const msg = `feat: add feature

This is the body with more details.
Multiple lines are allowed.`
  const result = validateCommitMessage(msg)
  expect(result.valid).toBe(true)
})

it('should accept every allowed type', () => {
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
it('should reject an empty message', () => {
  const result = validateCommitMessage('')
  expect(result.valid).toBe(false)
  expect(result.errors).toContain('Commit message is empty')
})

it('should reject a whitespace-only message as empty', () => {
  const result = validateCommitMessage('   \n\n  ')
  expect(result.valid).toBe(false)
  expect(result.errors).toContain('Commit message is empty')
})

it('should reject a message without a colon', () => {
  const result = validateCommitMessage('feat add login')
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('must match format')
})

it('should reject a message without a description', () => {
  const result = validateCommitMessage('feat:')
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('must match format')
})

it('should reject a whitespace-only description', () => {
  const result = validateCommitMessage('feat:   ')
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('must match format')
})

it('should reject an unknown type and list the allowed types', () => {
  const result = validateCommitMessage('unknown: some description')
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('Invalid type "unknown"')
  expect(result.errors[0]).toContain('Allowed types:')
})

it('should reject a too long subject line', () => {
  const longDesc = 'a'.repeat(120)
  const result = validateCommitMessage(`feat: ${longDesc}`)
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('Subject line too long')
})

it('should reject a body without a blank line after the subject', () => {
  const msg = `feat: add feature
This body starts immediately without blank line.`
  const result = validateCommitMessage(msg)
  expect(result.valid).toBe(false)
  expect(result.errors).toContain('There must be a blank line between subject and body')
})

// Scope validation with config
it('should reject a message without a scope when requireScope is set', () => {
  const result = validateCommitMessage('feat: no scope', { requireScope: true })
  expect(result.valid).toBe(false)
  expect(result.errors).toContain('Scope is required')
})

it('should accept a message with a scope when requireScope is set', () => {
  const result = validateCommitMessage('feat(api): has scope', { requireScope: true })
  expect(result.valid).toBe(true)
})

it('should reject a scope that is not in allowedScopes', () => {
  const result = validateCommitMessage('feat(invalid): wrong scope', {
    allowedScopes: ['api', 'ui', 'core'],
  })
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toContain('Scope must be one of the allowed scopes')
})

it('should accept a scope from allowedScopes', () => {
  const result = validateCommitMessage('feat(api): valid scope', {
    allowedScopes: ['api', 'ui', 'core'],
  })
  expect(result.valid).toBe(true)
})

it('should accept a message without a scope when allowedScopes is set', () => {
  const result = validateCommitMessage('feat: no scope is fine', {
    allowedScopes: ['api', 'ui', 'core'],
  })
  expect(result.valid).toBe(true)
})

it('should enforce requireScope and allowedScopes together', () => {
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
