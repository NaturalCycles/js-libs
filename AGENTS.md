# Language

Use standard technical English in all outputs. Write in plain, literal English with direct sentence
structure. Each sentence should be understandable linearly on the first reading. Put the main
subject and claim early, and place qualifications close to what they modify. Avoid metaphors,
similes, figurative language, rhetorical devices, conversational word order, parenthetical detours,
delayed qualifications, and ambiguous sentence structure. Prefer ordinary technical vocabulary over
clever or expressive phrasing. Do not simplify established technical terms.

# Development Guide

## Build & Test Commands

- Full validation (includes type-checking, linkting and running tests): `pnpm check`
- Quick validation (faster checks): `pnpm quick-check`
- Run single test file: `pnpm test fileName.test.ts --silent=false`
- Note: `pn` is an alias for `pnpm`.

**IMPORTANT:** Do NOT use `--filter`, `tsc`, or other low-level commands directly. Always use the
top-level commands (`pnpm check`, `pnpm test`) which handle everything correctly.

When working on a task - use `pnpm quick-check` to quickly validate the progress. When expected to
be done - use `pnpm check` to run full validation. Always run `pnpm check` before handing over the
work.

Never use npm or npx - use pnpm or pnpx instead.

## Code Style & Standards

- **Performance:** All code must be performance-optimized by default.
- **Consistency:** Strictly adhere to the existing codebase patterns.
- **Linting:** In-place rule overrides are permitted if necessary for working code; provide a brief
  justification for the override.

**Function ordering:** Follow top-down "newspaper style" - callers above callees. If function A
calls function B, A must appear above B in the file. Entry points and high-level logic at the top,
helper/implementation functions below. Read the file top-to-bottom like a newspaper: headline first,
then details.

```ts
// correct: caller above callee
function foo() {
  bar()
}
function bar() {}

// wrong: callee above caller
function bar() {}
function foo() {
  bar()
}
```

When changing code - DON'T remove pre-existing code comments, preserve them instead.

## Runtime Support

js-lib also runs in browsers, with a support floor of iOS Safari 16.7+ and Chrome 110+. The other
packages are Node-only (see `engines.node`).

- Use APIs available at the floor directly, without feature detection or fallbacks (e.g.
  `AggregateError`, `AbortSignal.timeout`, `Object.hasOwn`, `structuredClone`, `Array#toSorted`).
- APIs newer than the floor need a fallback in js-lib: e.g. `AbortSignal.any`, `Array.fromAsync`,
  `Response#bytes`, `Promise.withResolvers`, `Object.groupBy`, Set methods, iterator helpers,
  `Symbol.dispose`. TypeScript won't catch these, as `lib` is `esnext`.

## Array & Iterable Patterns

- **Shallow array copy:** prefer `arr.slice()` over `[...arr]`. Slice uses an optimized internal
  path in V8; spread goes through the iterator protocol and is slightly slower.
- **Non-mutating sort/reverse:** prefer `arr.toSorted(cmp)` over `arr.slice().sort(cmp)` and
  `arr.toReversed()` over `arr.slice().reverse()`. Single allocation, clearer intent. Same for
  `arr.toSpliced(...)`.
- **Mutating fast-path:** when an API supports `opt.mutate`, branch the sort:
  ```ts
  return opt.mutate ? items.sort(cmp) : items.toSorted(cmp)
  ```
- **Non-array iterables (Set, Map.values/keys, generic iterables):** use `Array.from(it)` instead of
  `[...it]`. `Array.from` has optimized fast paths for builtin iterables and is faster on large
  inputs.
- **Concatenation/append is not a copy:** `[...a, x]` and `[...a, ...b]` are not "shallow copy"
  patterns — leave them as spread.

## Readonly Arrays & Argument Mutation

- **Never mutate arguments** unless the function name (e.g `_pushUniq`) or an explicit option (e.g
  `opt.mutate`) says so. E.g sort a copy (`arr.toSorted(cmp)`), not the input (`arr.sort(cmp)`).
- **Exported functions and interface methods** that take an array they don't mutate should type it
  as `readonly T[]` (it accepts both mutable and readonly arrays, and documents the contract).
- **Private helpers** can use plain `T[]` - don't add `readonly` noise there.
- **Return types:** use `readonly T[]` only when returning internal state (or the input as-is);
  return plain `T[]` for freshly created arrays.
- **Performance exception:** mutable arrays (and in-place mutation of arrays the function owns) are
  fine where they measurably improve performance, e.g avoiding a copy in a hot path. Performance
  wins over readonly purity - but document the mutation if it's visible to the caller.

## Sort Comparators

Reuse the shared `comparators` object from `@naturalcycles/js-lib/array/sort.js` instead of inlining
comparator functions. Available: `numericAsc`, `numericDesc`, `localeAsc`, `localeDesc`,
`by(mapper, { dir })`, `updatedAsc/Desc`, `createdAsc/Desc`.

- `(a, b) => a - b` → `comparators.numericAsc`
- `(a, b) => a.localeCompare(b)` → `comparators.localeAsc`
- `(a, b) => a.field - b.field` → `comparators.by(r => r.field)`
- `(a, b) => a.field > b.field ? 1 : -1` (unstable on equality) → `comparators.by(r => r.field)` —
  also fixes the missing equality branch

## Testing Patterns

- **Structure:** For single-purpose test suites (targeting one class/function), use a flattened
  structure. Do not wrap in a top-level `describe()` block.

## Workflow Rules

- **Git:** Do NOT stage or unstage changes - leave all files in their current staged/unstaged state.

When asked to make a commit - do NOT add `Co-Authored-By: Claude`.

Never touch files in `__exclude` folder - they are archived and not used anywhere. They only exist
for history preservation purposes.
