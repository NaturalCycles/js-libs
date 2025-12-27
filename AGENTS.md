# Development Guide

## Build & Test Commands

- Full Validation: `pnpm check`
- Fast Iteration (Build + Test): `pnpm bt`
- Package Specific: `pnpm --filter <package-name> bt`
- Run single test file: `pnpm test fileName.test.ts`
- Note: `pn` is an alias for `pnpm`.

## Code Style & Standards

- **Performance:** All code must be performance-optimized by default.
- **Consistency:** Strictly adhere to the existing codebase patterns.
- **Linting:** In-place rule overrides are permitted if necessary for working code; provide a brief
  justification for the override.

**Function ordering:** Follow top-down "newspaper style" - callers above callees. If function A
calls function B, A must appear above B in the file. Entry points and high-level logic at the top,
helper/implementation functions below. Read the file top-to-bottom like a newspaper: headline first,
then details.

## Testing Patterns

- **Structure:** For single-purpose test suites (targeting one class/function), use a flattened
  structure. Do not wrap in a top-level `describe()` block.

## Workflow Rules

- **Git:** Do NOT stage changes. Leave all modifications unstaged for manual review of the
  incremental steps.
