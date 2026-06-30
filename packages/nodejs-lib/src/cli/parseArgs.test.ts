import { expect, expectTypeOf, test } from 'vitest'
import { _parseArgs, ParseArgsError } from './parseArgs.js'

test('basic types and optionality', () => {
  const args = _parseArgs(
    {
      str: { type: 'string' },
      num: { type: 'number', default: 100 },
      bool: { type: 'boolean' },
      req: { type: 'string', demandOption: true },
    },
    { args: ['--str', 'a', '--bool', '--req', 'r'] },
  )

  expect(args).toEqual({ _: [], str: 'a', num: 100, bool: true, req: 'r' })

  expectTypeOf(args.str).toEqualTypeOf<string | undefined>()
  expectTypeOf(args.num).toEqualTypeOf<number>() // has default => required
  expectTypeOf(args.bool).toEqualTypeOf<boolean | undefined>()
  expectTypeOf(args.req).toEqualTypeOf<string>() // demandOption => required
  expectTypeOf(args._).toEqualTypeOf<string[]>()
})

test('number coercion', () => {
  const args = _parseArgs({ n: { type: 'number' } }, { args: ['--n', '42'] })
  expect(args.n).toBe(42)
  expectTypeOf(args.n).toEqualTypeOf<number | undefined>()
})

test('invalid number throws', () => {
  expect(() => _parseArgs({ n: { type: 'number' } }, { args: ['--n', 'abc'] })).toThrow(
    ParseArgsError,
  )
})

test('array option', () => {
  const args = _parseArgs(
    { p: { type: 'string', array: true } },
    { args: ['--p', 'a', '--p', 'b'] },
  )
  expect(args.p).toEqual(['a', 'b'])
  expectTypeOf(args.p).toEqualTypeOf<string[] | undefined>()
})

test('array with scalar default is normalized to array', () => {
  const args = _parseArgs(
    { p: { type: 'string', array: true, default: './secret/**' } },
    { args: [] },
  )
  expect(args.p).toEqual(['./secret/**'])
  expectTypeOf(args.p).toEqualTypeOf<string[]>() // default present => required
})

test('number array', () => {
  const args = _parseArgs(
    { n: { type: 'number', array: true } },
    { args: ['--n', '1', '--n', '2'] },
  )
  expect(args.n).toEqual([1, 2])
  expectTypeOf(args.n).toEqualTypeOf<number[] | undefined>()
})

test('demandOption missing throws', () => {
  expect(() => _parseArgs({ x: { type: 'string', demandOption: true } }, { args: [] })).toThrow(
    /Missing required option: --x/,
  )
})

test('choices narrow the type and validate', () => {
  const args = _parseArgs(
    { cmd: { type: 'string', choices: ['success', 'start', 'fail'], default: 'success' } },
    { args: ['--cmd', 'start'] },
  )
  expect(args.cmd).toBe('start')
  expectTypeOf(args.cmd).toEqualTypeOf<'success' | 'start' | 'fail'>()

  expect(() =>
    _parseArgs(
      { cmd: { type: 'string', choices: ['success', 'start', 'fail'] } },
      { args: ['--cmd', 'nope'] },
    ),
  ).toThrow(/Invalid value for --cmd/)
})

test('numeric choices', () => {
  const args = _parseArgs(
    { size: { type: 'number', choices: [128, 256] as const, default: 256 } },
    { args: ['--size', '128'] },
  )
  expect(args.size).toBe(128)
  expectTypeOf(args.size).toEqualTypeOf<128 | 256>()
})

test('negated boolean (--no-flag)', () => {
  const args = _parseArgs(
    { overwrite: { type: 'boolean', default: true } },
    { args: ['--no-overwrite'] },
  )
  expect(args.overwrite).toBe(false)
  expectTypeOf(args.overwrite).toEqualTypeOf<boolean>()
})

test('short alias', () => {
  const args = _parseArgs({ verbose: { type: 'boolean', short: 'v' } }, { args: ['-v'] })
  expect(args.verbose).toBe(true)
})

test('positionals and minPositionals', () => {
  const args = _parseArgs({ x: { type: 'string' } }, { args: ['a', 'b', '--x', '1'] })
  expect(args._).toEqual(['a', 'b'])
  const [first, ...rest] = args._
  expect(first).toBe('a')
  expect(rest).toEqual(['b'])

  expect(() => _parseArgs({}, { args: ['a'], minPositionals: 2 })).toThrow(
    /Expected at least 2 positional/,
  )
})

test('unknown option is ignored by default', () => {
  const args = _parseArgs({ x: { type: 'string' } }, { args: ['--nope', '--x', '1'] })
  expect(args).toEqual({ _: [], x: '1' })
  expect(args).not.toHaveProperty('nope')
})

test('unknown option throws in strict mode', () => {
  expect(() => _parseArgs({ x: { type: 'string' } }, { args: ['--nope'], strict: true })).toThrow(
    ParseArgsError,
  )
})

test('env-var default stays optional', () => {
  const args = _parseArgs(
    { token: { type: 'string', default: process.env['NON_EXISTENT_VAR_XYZ'] } },
    { args: [] },
  )
  expect(args.token).toBeUndefined()
  expectTypeOf(args.token).toEqualTypeOf<string | undefined>()
})
