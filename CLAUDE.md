# CLAUDE.md - Development Guide

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

## Testing Patterns

- **Structure:** For single-purpose test suites (targeting one class/function), use a flattened
  structure. Do not wrap in a top-level `describe()` block.

## Workflow Rules

- **Git:** Do NOT stage changes. Leave all modifications unstaged for manual review of the
  incremental steps.
