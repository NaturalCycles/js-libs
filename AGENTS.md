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

## Testing Patterns

- **Structure:** For single-purpose test suites (targeting one class/function), use a flattened
  structure. Do not wrap in a top-level `describe()` block.

## Workflow Rules

- **Git:** Do NOT stage changes. Leave all modifications unstaged for manual review of the
  incremental steps.

When asked to make a commit - do NOT add `Co-Authored-By: Claude`.
