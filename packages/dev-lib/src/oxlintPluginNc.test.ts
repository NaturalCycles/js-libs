import { RuleTester } from 'oxlint/plugins-dev'
import { describe, it } from 'vitest'
import ncPlugin from '../cfg/oxlint-plugin-nc.js'

RuleTester.describe = describe
RuleTester.it = it

new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } }).run(
  'prefer-assert',
  ncPlugin.rules['prefer-assert'],
  {
    valid: [
      `if (!user) throw new AppError('no user');
else console.log(user)`,
      `if (a) foo();
else if (!user) throw new AppError('no user')`,
      `if (!user) throw new NotFoundError('no user')`,
      `try { foo() } catch (err) { if (!retry) throw err }`,
      `if (!user) throw new AppError('no user', { userId }, { cause })`,
      `if (err instanceof JWTExpiredError) throw new AppError('expired')`,
      `if (!pa.pw && pwOld) throw new AppError('wrong old password')`,
      `if (lastPeriodDate > today) throw new AppError('in the future')`,
      `if (!pa.pw) throw new AppError(tr('error-wrongOldPw', pa.lang))`,
      `if (!response.ok) throw new Error(await response.text())`,
      `if (!ok) throw new AppError('failed', { details: format(details) })`,
      `if (flags.some(flag => flag > 1)) throw new AppError('forbidden flags')`,
      `if (flags.some(flag => flag > 1) === true) throw new AppError('forbidden flags')`,
      `if (!ok) throw new AppError('failed', { count: counter++ })`,
      `if (!ok) throw new AppError('failed', { last: lastError = err })`,
      `if (!res.ok) throw new Error(res.error)`,
      `if (err) throw new AppError(err.message, { backendResponseStatusCode: 401 })`,
      `if (!this.sessionId) throw new AppError(this.sessionId)`,
      // a value read in both the condition and the message is skipped too: cheap to check, rarely worth asserting
      'if (!config[field]) throw new Error(`Unsupported field: ${field}`)',
      // an interpolated message is built on every call once inside `_assert`
      'if (!user) throw new Error(`no user for ${id}`)',
      `if (isEmpty(items)) throw new AppError('nothing to do', { items })`,
      { code: `if (!user) throw new Error('no user')`, filename: 'src/user.test.ts' },
      { code: `if (!user) throw new Error('no user')`, filename: 'src/user.test.tsx' },
      { code: `if (!user) throw new Error('no user')`, filename: 'src/user.spec.ts' },
      { code: `if (!user) throw new Error('no user')`, filename: 'src/user.spec.tsx' },
      { code: `if (!user) throw new Error('no user')`, filename: 'src/user.test.js' },
      { code: `if (!user) throw new Error('no user')`, filename: 'src/user.test.mjs' },
      `if (!ok) throw new Error('failed', { cause })`,
      `if (!ok) throw new AppError('failed', { ...details })`,
      { code: `if (!user) throw new Error('no user')`, filename: 'src/test/mockUser.ts' },
      { code: `if (!user) throw new Error('no user')`, filename: 'src/testing/mockUser.ts' },
    ],
    invalid: [
      { code: `if (!user) throw new AppError('no user', { userId })`, errors: 1 },
      { code: `if (user) { throw new Error('user exists') }`, errors: 1 },
      { code: `if (a === b) throw new AssertionError('same')`, errors: 1 },
      { code: `if (!user) {\n  // comment\n  throw new AppError('no user')\n}`, errors: 1 },
      {
        code: `if (!msg) throw new AppError('Message not found', { msgId, backendResponseStatusCode: 404 })`,
        errors: 1,
      },
      {
        code: `if (!this.sessionId) throw new AppError('sessionId required', { sessionId })`,
        errors: 1,
      },
      { code: `if (!user) throw new Error('no user')`, filename: 'src/user.ts', errors: 1 },
    ],
  },
)
