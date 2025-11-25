## @naturalcycles/js-libs

> Monorepo for open source `@naturalcycles/*-lib` packages

# [Documentation](https://naturalcycles.github.io/js-libs/)

## Local development

When developing in any package in this repository simultaneously with other repositiories that are
dependent on those changes follow this commads:

- Run `pnpm build` in this repo.
- In the target repo, run

```sh
$ pnpm link ../packages/[NAME_OF_THE_PACKAGE] # Replace with relative path to the package.
```

See [pnpm link documentation](https://pnpm.io/cli/link) for more information on differences and use
cases.
