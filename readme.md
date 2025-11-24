## @naturalcycles/js-libs

> Monorepo for open source `@naturalcycles/*-lib` packages

# [Documentation](https://naturalcycles.github.io/js-libs/)

## Local development

See [pnpm link documentation](https://pnpm.io/cli/link) for more information on differences and use
cases.

- Run `pnpm build` in this repo.
- In the target repo, run

```sh
pnpm link ../packages/[NAME_OF_THE_PACKAGE] # Replace with relative path to the package.
```
