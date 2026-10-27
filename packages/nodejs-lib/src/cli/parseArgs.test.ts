import type { IsoDate } from '@naturalcycles/js-lib/types'
import { expect, expectTypeOf, it } from 'vitest'
import { _parseArgs, ParseArgsError } from './parseArgs.js'

it('should parse basic option types and make defaulted or demanded options non-optional', () => {
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

it('should coerce a number option from its string value', () => {
  const args = _parseArgs({ n: { type: 'number' } }, { args: ['--n', '42'] })
  expect(args.n).toBe(42)
  expectTypeOf(args.n).toEqualTypeOf<number | undefined>()
})

it('should throw a ParseArgsError for an invalid number', () => {
  expect(() => _parseArgs({ n: { type: 'number' } }, { args: ['--n', 'abc'] })).toThrow(
    ParseArgsError,
  )
})

it('should collect a repeated array option into an array', () => {
  const args = _parseArgs(
    { p: { type: 'string', array: true } },
    { args: ['--p', 'a', '--p', 'b'] },
  )
  expect(args.p).toEqual(['a', 'b'])
  expectTypeOf(args.p).toEqualTypeOf<string[] | undefined>()
})

it('should normalize a scalar default of an array option to an array', () => {
  const args = _parseArgs(
    { p: { type: 'string', array: true, default: './secret/**' } },
    { args: [] },
  )
  expect(args.p).toEqual(['./secret/**'])
  expectTypeOf(args.p).toEqualTypeOf<string[]>() // default present => required
})

it('should coerce each value of a number array option', () => {
  const args = _parseArgs(
    { n: { type: 'number', array: true } },
    { args: ['--n', '1', '--n', '2'] },
  )
  expect(args.n).toEqual([1, 2])
  expectTypeOf(args.n).toEqualTypeOf<number[] | undefined>()
})

it('should throw when a demandOption option is missing', () => {
  expect(() => _parseArgs({ x: { type: 'string', demandOption: true } }, { args: [] })).toThrow(
    /Missing required option: --x/,
  )
})

it('should narrow the type to the choices and reject a value outside them', () => {
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

it('should accept a numeric choice and narrow the type to the numeric choices', () => {
  const args = _parseArgs(
    { size: { type: 'number', choices: [128, 256] as const, default: 256 } },
    { args: ['--size', '128'] },
  )
  expect(args.size).toBe(128)
  expectTypeOf(args.size).toEqualTypeOf<128 | 256>()
})

it('should set a defaulted boolean to false with --no-flag', () => {
  const args = _parseArgs(
    { overwrite: { type: 'boolean', default: true } },
    { args: ['--no-overwrite'] },
  )
  expect(args.overwrite).toBe(false)
  expectTypeOf(args.overwrite).toEqualTypeOf<boolean>()
})

it('should coerce boolean --flag=false to false', () => {
  const args = _parseArgs(
    { requireJira: { type: 'boolean', default: true } },
    { args: ['--requireJira=false'] },
  )
  expect(args.requireJira).toBe(false)
  expectTypeOf(args.requireJira).toEqualTypeOf<boolean>()
})

it('should coerce boolean --flag=true to true', () => {
  const args = _parseArgs(
    { requireJira: { type: 'boolean', default: false } },
    { args: ['--requireJira=true'] },
  )
  expect(args.requireJira).toBe(true)
})

it('should throw on an invalid boolean value', () => {
  expect(() => _parseArgs({ b: { type: 'boolean' } }, { args: ['--b=nope'] })).toThrow(
    /Invalid boolean for --b/,
  )
})

it('should throw on a boolean flag followed by a space-separated true or false', () => {
  // node never consumes the next token as a boolean's value, so `--arg false`
  // would silently yield `arg: true` and leak "false" into positionals.
  expect(() => _parseArgs({ arg: { type: 'boolean' } }, { args: ['--arg', 'false'] })).toThrow(
    /Boolean option --arg does not take a space-separated value.*--arg=false or --no-arg/,
  )
  expect(() => _parseArgs({ arg: { type: 'boolean' } }, { args: ['--arg', 'true'] })).toThrow(
    /--arg=true or --arg/,
  )
})

it('should leave a non-boolean token after a boolean flag as a positional', () => {
  const args = _parseArgs({ arg: { type: 'boolean' } }, { args: ['--arg', 'foo.txt'] })
  expect(args).toEqual({ _: ['foo.txt'], arg: true })
})

it('should throw when a non-boolean option is passed as a bare flag', () => {
  // node returns boolean `true` for a bare flag in non-strict mode; without this
  // guard a string field would be `true` and a number field would silently be `1`.
  expect(() => _parseArgs({ x: { type: 'string' } }, { args: ['--x'] })).toThrow(
    /Missing value for --x/,
  )
  expect(() => _parseArgs({ n: { type: 'number' } }, { args: ['--n'] })).toThrow(
    /Missing value for --n/,
  )
  expect(() => _parseArgs({ s: {} }, { args: ['--s'] })).toThrow(/Missing value for --s/)
  expect(() =>
    _parseArgs({ date: { transform: s => s.toUpperCase() } }, { args: ['--date'] }),
  ).toThrow(/Missing value for --date/)
  expect(() => _parseArgs({ p: { type: 'string', array: true } }, { args: ['--p'] })).toThrow(
    /Missing value for --p/,
  )
})

it('should parse a short alias', () => {
  const args = _parseArgs({ verbose: { type: 'boolean', short: 'v' } }, { args: ['-v'] })
  expect(args.verbose).toBe(true)
})

it('should collect positionals and throw when fewer than minPositionals are given', () => {
  const args = _parseArgs({ x: { type: 'string' } }, { args: ['a', 'b', '--x', '1'] })
  expect(args._).toEqual(['a', 'b'])
  const [first, ...rest] = args._
  expect(first).toBe('a')
  expect(rest).toEqual(['b'])

  expect(() => _parseArgs({}, { args: ['a'], minPositionals: 2 })).toThrow(
    /Expected at least 2 positional/,
  )
})

it('should ignore an unknown option by default', () => {
  const args = _parseArgs({ x: { type: 'string' } }, { args: ['--nope', '--x', '1'] })
  expect(args).toEqual({ _: [], x: '1' })
  expect(args).not.toHaveProperty('nope')
})

it('should throw a ParseArgsError on an unknown option in strict mode', () => {
  expect(() => _parseArgs({ x: { type: 'string' } }, { args: ['--nope'], strict: true })).toThrow(
    ParseArgsError,
  )
})

it('should default the option type to string', () => {
  const args = _parseArgs({ s: {}, n: { type: 'number' } }, { args: ['--s', 'x', '--n', '5'] })
  expect(args).toEqual({ _: [], s: 'x', n: 5 })
  expectTypeOf(args.s).toEqualTypeOf<string | undefined>()
  expectTypeOf(args.n).toEqualTypeOf<number | undefined>()
})

it('should infer the branded type returned by transform', () => {
  const args = _parseArgs(
    { date: { transform: s => s as IsoDate } },
    { args: ['--date', '2020-01-01'] },
  )
  expect(args.date).toBe('2020-01-01')
  expectTypeOf(args.date).toEqualTypeOf<IsoDate | undefined>()
})

it('should apply transform to the value', () => {
  const args = _parseArgs(
    { name: { transform: s => s.toUpperCase() } },
    { args: ['--name', 'abc'] },
  )
  expect(args.name).toBe('ABC')
  expectTypeOf(args.name).toEqualTypeOf<string | undefined>()
})

it('should apply transform to each array element', () => {
  const args = _parseArgs(
    { ids: { array: true, transform: Number } },
    { args: ['--ids', '1', '--ids', '2'] },
  )
  expect(args.ids).toEqual([1, 2])
  expectTypeOf(args.ids).toEqualTypeOf<number[] | undefined>()
})

it('should not apply transform to the default value', () => {
  const seen: string[] = []
  const args = _parseArgs(
    {
      date: {
        default: '2020-01-01' as IsoDate,
        transform: s => {
          seen.push(s)
          return s as IsoDate
        },
      },
    },
    { args: [] },
  )
  expect(args.date).toBe('2020-01-01')
  expect(seen).toEqual([]) // transform not called for default
  expectTypeOf(args.date).toEqualTypeOf<IsoDate>() // default present => required
})

it('should keep an option optional when its default is an unset env var', () => {
  const args = _parseArgs(
    { token: { type: 'string', default: process.env['NON_EXISTENT_VAR_XYZ'] } },
    { args: [] },
  )
  expect(args.token).toBeUndefined()
  expectTypeOf(args.token).toEqualTypeOf<string | undefined>()
})
