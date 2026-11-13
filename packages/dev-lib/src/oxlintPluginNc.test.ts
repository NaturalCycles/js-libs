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
      `if ((a && b) || c) throw new AppError('mixed operators')`,
      `if (a ?? b) throw new AppError('nullish')`,
      `if (err instanceof HttpRequestError && err.data.code === 429) throw new AppError('rate limit')`,
      `if (a && items.some(item => item > 1)) throw new AppError('forbidden items')`,
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
      // a call inside an interpolated message would run on every call once inside `_assert`
      'if (!user) throw new Error(`no user for ${getId()}`)',
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
      { code: `if (!pa.pw && pwOld) throw new AppError('wrong old password')`, errors: 1 },
      { code: `if (!file || !dir || !out) throw new Error('all three are required')`, errors: 1 },
      { code: 'if (!user) throw new Error(`no user for ${id}`)', errors: 1 },
      {
        code: 'if (vvReport && !isDefaultLang) throw new Error(`only for the ${langService.LANG_DEFAULT} run`)',
        errors: 1,
      },
    ],
  },
)

new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } }).run(
  'prefer-last',
  ncPlugin.rules['prefer-last'],
  {
    valid: [
      `_last(items)`,
      `items.at(0)`,
      `items.at(-2)`,
      `items[items.length - 2]`,
      `items[other.length - 1]`,
      `items[items.length - 1] = item`,
      `items[items.length - 1]++`,
      `delete items[items.length - 1]`,
      // undefined when `account` is, which `_lastOrUndefined` does not accept
      `account?.items.at(-1)`,
      `items?.at(-1)`,
      `items?.[items.length - 1]`,
      `'abc'.at(-1)`,
      `getItems()[getItems().length - 1]`,
      `items.slice(-2)[0]`,
      `items.slice(-1)[1]`,
    ],
    invalid: [
      { code: `items.at(-1)`, errors: 1 },
      { code: `items.at(-1)!`, errors: 1 },
      { code: `getItems().at(-1)`, errors: 1 },
      { code: `items[items.length - 1]`, errors: 1 },
      { code: `this.items[this.items.length - 1]`, errors: 1 },
      { code: `account.items[account.items.length - 1]!.id`, errors: 1 },
      { code: `items.slice(-1)[0]`, errors: 1 },
      // only the inner call: the outer one is undefined when there is no last item
      { code: `items.at(-1)?.children.at(-1)`, errors: 1 },
      { code: `items.at(-1)`, filename: 'src/items.test.ts', errors: 1 },
    ],
  },
)

new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } }).run(
  'prefer-env-destructuring',
  ncPlugin.rules['prefer-env-destructuring'],
  {
    valid: [
      `const { APP_ENV } = process.env`,
      `const { APP_ENV, CI = 'false' } = process.env`,
      `const env = process.env`,
      `process.env[name]`,
      `process.env['npm_config_user-agent']`,
      `process.env.APP_ENV = 'test'`,
      `process.env['APP_ENV'] = 'test'`,
      `process.env['APP_ENV'] ||= 'test'`,
      `delete process.env['APP_ENV']`,
      `import.meta.env.APP_ENV`,
      // shared browser/server code: a destructuring would throw where `process` does not exist
      `import.meta.env?.['VITE_ENV'] || process?.env['VITE_ENV']`,
      `config.env.APP_ENV`,
      { code: `expect(process.env['APP_ENV']).toBe('test')`, filename: 'src/env.test.ts' },
      { code: `const prev = process.env['APP_ENV']`, filename: 'src/test/mockEnv.ts' },
    ],
    invalid: [
      { code: `const login = process.env['GITHUB_TRIGGERING_ACTOR']`, errors: 1 },
      { code: `const appEnv = process.env.APP_ENV`, errors: 1 },
      { code: `if (process.env['CI']) run()`, errors: 1 },
      { code: `const port = Number(process.env['PORT'] || 8080)`, errors: 1 },
      { code: `process.env['APP_ENV'] === 'prod' && process.env['DEBUG']`, errors: 2 },
    ],
  },
)
