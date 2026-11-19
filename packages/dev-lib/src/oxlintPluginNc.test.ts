import { RuleTester } from 'oxlint/plugins-dev'
import { describe, it } from 'vitest'
import ncPlugin from '../cfg/oxlint-plugin-nc.js'

RuleTester.describe = describe
RuleTester.it = it

new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } }).run(
  'no-singleton-self-reference',
  ncPlugin.rules['no-singleton-self-reference'],
  {
    valid: [
      `class CrmService { track() { this.send() } send() {} }
export const crmService = new CrmService()`,
      // another class's singleton
      `class CrmService { track() { mailService.send() } }
export const crmService = new CrmService()
export const mailService = new MailService()`,
      // outside the class
      `class CrmService { send() {} }
export const crmService = new CrmService()
export function track() { crmService.send() }`,
      // `this` is the class in a static member
      `class CrmService { static create() { return crmService.send() } send() {} }
export const crmService = new CrmService()`,
      `class CrmService { static { crmService.send() } send() {} }
export const crmService = new CrmService()`,
      `class CrmService { static handler = () => crmService.send(); send() {} }
export const crmService = new CrmService()`,
      // a function with its own `this`
      `class CrmService { track() { return function () { crmService.send() } } send() {} }
export const crmService = new CrmService()`,
      `class CrmService { track() { return { run() { crmService.send() } } } send() {} }
export const crmService = new CrmService()`,
      // a nested class
      `class CrmService { track() { return class { run() { crmService.send() } } } send() {} }
export const crmService = new CrmService()`,
      // two instances: the one named is not necessarily `this`
      `class CrmService { track() { crmService.send() } send() {} }
export const crmService = new CrmService()
export const otherCrmService = new CrmService()`,
      `class CrmService { static create() { return new CrmService() } track() { crmService.send() } send() {} }
export const crmService = new CrmService()`,
      // a local variable that shadows the singleton
      `class CrmService { track(crmService: Other) { crmService.send() } }
export const crmService = new CrmService()`,
      // not a module-level const
      `class CrmService { track() { getCrmService().send() } send() {} }
function getCrmService() { const crmService = new CrmService(); return crmService }`,
      `class CrmService { clone(): typeof crmService { return this } }
export const crmService = new CrmService()`,
      `class CrmService { @Memo(crmService) track() {} }
export const crmService = new CrmService()`,
      // a parameter decorator's callback has no instance `this`
      `class CrmService { track(@Inject(forwardRef(() => crmService)) dependency: unknown) {} }
export const crmService = new CrmService()`,
      // a nested class of the same name is not the singleton's class
      `class CrmService { track() { class CrmService { run() { crmService.send() } } return CrmService } send() {} }
export const crmService = new CrmService()`,
    ],
    invalid: [
      {
        code: `class CrmService { track() { crmService.send() } send() {} }
export const crmService = new CrmService()`,
        errors: 1,
      },
      {
        code: `class CrmService { track() { crmService.send() } send() {} }
const crmService = new CrmService()`,
        errors: 1,
      },
      {
        code: `export const crmService = new CrmService()
class CrmService { async track() { await pMap(items, async item => await crmService.send(item)) } async send(item) {} }`,
        errors: 1,
      },
      {
        code: `class CrmService { handler = () => crmService.send(); send() {} }
export const crmService = new CrmService()`,
        errors: 1,
      },
      {
        code: `class CrmService { get name() { return crmService.title } constructor() { register(crmService) } }
export const crmService = new CrmService()`,
        errors: 2,
      },
      {
        code: `class CrmService { track(name = crmService.title) { const { send } = crmService; crmService.count++ } }
export const crmService = new CrmService()`,
        errors: 3,
      },
      // a parameter that shadows the class is a different constructor
      {
        code: `class CrmService { track() { crmService.send() } send() {} }
export const crmService = new CrmService()
function make(CrmService: new () => unknown) { return new CrmService() }`,
        errors: 1,
      },
      {
        code: `export class CrmService { track() { crmService.send() } send() {} }
export const crmService = new CrmService()`,
        errors: 1,
      },
      {
        code: `class CrmService extends BaseService { track() { crmService.send() } }
export const crmService = new CrmService({ retries: 2 })`,
        errors: 1,
      },
    ],
  },
)

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
      `'abc'.slice(-1)[0]`,
      `[items[items.length - 1]] = values`,
      `({ last: items[items.length - 1] } = values)`,
      `for (items[items.length - 1] of values) run()`,
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
      // a read in a computed key or a default value of a destructuring assignment
      { code: `({ [items[items.length - 1]]: last } = values)`, errors: 1 },
      { code: `[last = items[items.length - 1]] = values`, errors: 1 },
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
      `const { GITHUB_TRIGGERING_ACTOR: login } = process.env`,
      `const env = process.env`,
      // used directly in an expression: destructuring would only add a single-use variable
      `if (process.env['CI']) run()`,
      `const isCI = !!process.env.CI`,
      `const isDev = process.env['APP_ENV'] === 'dev'`,
      `const port = Number(process.env['PORT'] || 8080)`,
      `const baseUrl = process.env['BASE_URL'] || 'https://example.com'`,
      `const token = process.env['GITHUB_TOKEN']!`,
      'const auth = `Token ${process.env.DD_TOKEN}`',
      `run({ webhook: process.env.SLACK_WEBHOOK_URL })`,
      `const name = process.env[key]`,
      `const agent = process.env['npm_config_user-agent']`,
      `const fallback = process.env.default`,
      `process.env.APP_ENV = 'test'`,
      `delete process.env['APP_ENV']`,
      `const appEnv = import.meta.env.APP_ENV`,
      `const appEnv = config.env.APP_ENV`,
      // shared browser/server code: a destructuring would throw where `process` does not exist
      `const viteEnv = process?.env['VITE_ENV']`,
      `const nodeEnv = process.env?.['NODE_ENV']`,
      { code: `const prev = process.env['APP_ENV']`, filename: 'src/env.test.ts' },
      { code: `const prev = process.env['APP_ENV']`, filename: 'src/test/mockEnv.ts' },
    ],
    invalid: [
      { code: `const login = process.env['GITHUB_TRIGGERING_ACTOR']`, errors: 1 },
      { code: `const appEnv = process.env.APP_ENV`, errors: 1 },
      { code: `const APP_ENV = process.env.APP_ENV`, errors: 1 },
      { code: `export const bucket = process.env['E2E_SCREENSHOTS_BUCKET']`, errors: 1 },
      { code: `let limit = process.env.LIMIT`, errors: 1 },
      { code: `const a = process.env.A, b = process.env.B`, errors: 2 },
    ],
  },
)
