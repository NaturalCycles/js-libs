# AGENTS.md

## Monorepo

This is a monorepo using pnpm.

On a local machine `pnpm` is aliased as `pn`, so, if you see `pn` - just run `pnpm` instead.

## Monorepo-wide commands

- `pnpm check` – full build, test, lint, and validation across the monorepo.
- `pnpm bt` – build and test only (faster, skips linting).

## Usage Notes

- Prefer `pnpm bt` for fast iteration.
- Use `pnpm check` for full validation.
- To run commands for a specific package:

```bash
pnpm --filter <package-name> bt
```

## Code style

All code should be performance optimized (fast) by default.

Stick to the existing code style.

It's ok to ignore certain lint rules in-place to be able to deliver working code, explain why it's
safe to disable a certain rule.

## Tests

If a test suite is for one specific class or function - don't wrap the code in
`describe('MyClass')`, but flatten it instead.

## Git

Don't stage your changes. Make changes, but keep them unstaged, so I can clearly see what was done
one step before, and what was done in the last step.
