import { parseArgs } from 'node:util'

/**
 * Allowed CLI option value types.
 */
export type CliOptionType = 'string' | 'number' | 'boolean'

/**
 * Declarative definition of a single CLI option, modeled after the subset of
 * yargs `.options()` that we actually use.
 */
export interface CliOption {
  type: CliOptionType
  /**
   * Accept the flag multiple times, collecting values into an array.
   * `--id a --id b` => `['a', 'b']`. Replaces yargs `type: 'array'`.
   */
  array?: boolean
  /**
   * Default value, applied when the flag is not provided.
   * Providing a non-`undefined` default makes the output field non-optional.
   */
  default?: string | number | boolean | readonly (string | number)[]
  /**
   * Mark the option as required. Throws/exits if not provided.
   * Makes the output field non-optional.
   */
  demandOption?: boolean
  /**
   * Restrict the value to a set of allowed values. With a `const` call (the
   * default here) the output type is narrowed to the union of the literals.
   */
  choices?: readonly (string | number)[]
  /**
   * Help text, shown in `--help` output.
   */
  desc?: string
  /**
   * Single-character alias, e.g. `short: 'v'` enables `-v`.
   */
  short?: string
}

export type CliOptions = Record<string, CliOption>

/**
 * Element value type of a single option, derived from `choices` (if present)
 * or `type`.
 */
type ElemType<O extends CliOption> = O extends { choices: readonly (infer C)[] }
  ? C
  : O['type'] extends 'string'
    ? string
    : O['type'] extends 'number'
      ? number
      : O['type'] extends 'boolean'
        ? boolean
        : never

/**
 * Full value type of a single option, applying `array` on top of the element
 * type.
 */
type ValueType<O extends CliOption> = O extends { array: true } ? ElemType<O>[] : ElemType<O>

/**
 * An option is "required" (non-optional in the output) when it is `demandOption`
 * or has a non-`undefined` `default`. `NonNullable<unknown>` matches any
 * non-null/undefined value, so `default: false | 0 | ''` correctly counts as
 * present, while `default: process.env.X` (which may be `undefined`) stays optional.
 */
type IsRequired<O extends CliOption> = O extends { demandOption: true }
  ? true
  : O extends { default: NonNullable<unknown> }
    ? true
    : false

/**
 * Flattens an intersection into a single object type for nicer hovers.
 */
type Simplify<T> = { [K in keyof T]: T[K] } & {}

/**
 * Output type inferred from the options config - the clean `@types/yargs@16`
 * shape: exactly the declared keys with correct optionality, plus `_` for
 * positionals. No `[x: string]: unknown` index signature, no camelCase/kebab
 * key duplication (the `@types/yargs@17` noise).
 */
export type InferCliArgs<O extends CliOptions> = Simplify<
  {
    [K in keyof O as IsRequired<O[K]> extends true ? K : never]: ValueType<O[K]>
  } & {
    [K in keyof O as IsRequired<O[K]> extends true ? never : K]?: ValueType<O[K]>
  } & {
    /** Positional arguments (yargs `_`). */
    _: string[]
  }
>

export interface ParseArgsOptions {
  /**
   * Args to parse. Defaults to `process.argv.slice(2)` (no `hideBin` needed).
   */
  args?: string[]
  /**
   * Require at least this many positional args. Replaces yargs `.demandCommand`.
   */
  minPositionals?: number
  /**
   * Usage line shown at the top of `--help`.
   */
  usage?: string
  /**
   * When `true`, unknown options throw a {@link ParseArgsError}.
   * When `false` (default), unknown options are silently ignored - matching
   * yargs' default lenient behavior. Important when several parsers read the
   * same `process.argv` and each only knows about its own subset of options.
   */
  strict?: boolean
}

/**
 * Thrown by {@link _parseArgs} on invalid input (missing/invalid option,
 * too few positionals). Unknown options are ignored, not rejected.
 */
export class ParseArgsError extends Error {
  override name = 'ParseArgsError'
}

/**
 * In-house, type-inferred replacement for `yargs().options(...).argv`, built on
 * top of node's `util.parseArgs`.
 *
 * @example
 * const { dir, limit } = _parseArgs({
 *   dir: { type: 'string', desc: 'Output directory' },
 *   limit: { type: 'number', default: 100 },
 * })
 * // dir?: string   limit: number   _: string[]
 */
export function _parseArgs<const O extends CliOptions>(
  options: O,
  opt: ParseArgsOptions = {},
): InferCliArgs<O> {
  const { args, minPositionals = 0, usage, strict = false } = opt

  // node's parseArgs only supports string|boolean, so `number` is parsed as a
  // string and coerced afterwards. We also never forward `default` (parseArgs
  // rejects e.g. a numeric default on a string-typed option) - defaults are
  // applied by us below.
  const nodeOptions: Record<
    string,
    { type: 'string' | 'boolean'; multiple?: boolean; short?: string }
  > = options['help'] ? {} : { help: { type: 'boolean', short: 'h' } }
  for (const [name, def] of Object.entries(options)) {
    // parseArgs rejects `undefined` for `short`/`multiple`, so only set when present
    const nodeOption: { type: 'string' | 'boolean'; multiple?: boolean; short?: string } = {
      type: def.type === 'boolean' ? 'boolean' : 'string',
    }
    if (def.array) nodeOption.multiple = true
    if (def.short) nodeOption.short = def.short
    nodeOptions[name] = nodeOption
  }

  const parsed = (() => {
    try {
      return parseArgs({
        args,
        options: nodeOptions,
        allowPositionals: true,
        allowNegative: true, // native `--no-flag` support for booleans
        // In non-strict mode, unknown options are collected into `values` but
        // ignored below, since we only read declared options. See `strict` docs.
        strict,
      })
    } catch (err) {
      throw new ParseArgsError((err as Error).message)
    }
  })()

  const values = parsed.values as Record<string, unknown>

  if (!options['help'] && values['help']) {
    process.stdout.write(buildHelp(options, usage))
    process.exit(0)
  }

  const result: Record<string, unknown> = { _: parsed.positionals }

  for (const [name, def] of Object.entries(options)) {
    let v = values[name]

    if (v === undefined) {
      if (def.default !== undefined) {
        v = def.default
      } else if (def.demandOption) {
        throw new ParseArgsError(`Missing required option: --${name}`)
      } else {
        continue // leave absent
      }
    }

    // normalize to array (e.g. a scalar default on an `array` option)
    if (def.array) {
      v = Array.isArray(v) ? v : [v]
    }

    if (def.type === 'number') {
      v = Array.isArray(v) ? v.map(x => toNumber(x, name)) : toNumber(v, name)
    }

    if (def.choices) {
      const list = Array.isArray(v) ? v : [v]
      for (const x of list) {
        if (!def.choices.includes(x as string | number)) {
          throw new ParseArgsError(
            `Invalid value for --${name}: "${x}". Choices: ${def.choices.join(', ')}`,
          )
        }
      }
    }

    result[name] = v
  }

  if (parsed.positionals.length < minPositionals) {
    throw new ParseArgsError(
      `Expected at least ${minPositionals} positional argument(s), got ${parsed.positionals.length}`,
    )
  }

  return result as InferCliArgs<O>
}

function toNumber(raw: unknown, name: string): number {
  const n = Number(raw)
  if (Number.isNaN(n)) {
    throw new ParseArgsError(`Invalid number for --${name}: "${raw}"`)
  }
  return n
}

function buildHelp(options: CliOptions, usage?: string): string {
  const lines: string[] = []
  if (usage) lines.push(usage, '')
  lines.push('Options:')
  for (const [name, def] of Object.entries(options)) {
    const flag = def.short ? `-${def.short}, --${name}` : `--${name}`
    const meta = [`[${def.array ? `${def.type}[]` : def.type}]`]
    if (def.demandOption) meta.push('[required]')
    if (def.default !== undefined) meta.push(`[default: ${JSON.stringify(def.default)}]`)
    if (def.choices) meta.push(`[choices: ${def.choices.join(', ')}]`)
    lines.push(`  ${flag}  ${meta.join(' ')}${def.desc ? `  ${def.desc}` : ''}`)
  }
  lines.push('  -h, --help  Show help')
  return `${lines.join('\n')}\n`
}
