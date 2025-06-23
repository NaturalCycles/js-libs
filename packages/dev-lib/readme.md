## @naturalcycles/dev-lib

> Set of opinionated configuration files and tools for common project needs, to be shared between
> all modules. Enforces conventions between projects.

[![npm](https://img.shields.io/npm/v/@naturalcycles/dev-lib/latest.svg)](https://www.npmjs.com/package/@naturalcycles/dev-lib)
[![install size](https://packagephobia.now.sh/badge?p=@naturalcycles/dev-lib)](https://packagephobia.now.sh/result?p=@naturalcycles/dev-lib)
[![Maintainability](https://api.codeclimate.com/v1/badges/7df5e4dc0514ff142b7b/maintainability)](https://codeclimate.com/github/NaturalCycles/dev-lib/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/7df5e4dc0514ff142b7b/test_coverage)](https://codeclimate.com/github/NaturalCycles/dev-lib/test_coverage)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Known Vulnerabilities](https://snyk.io/package/npm/snyk/badge.svg)](https://snyk.io/package/npm/@naturalcycles/dev-lib)
[![Actions](https://github.com/NaturalCycles/dev-lib/workflows/default/badge.svg)](https://github.com/NaturalCycles/dev-lib/actions)

## Tools that dev-lib enables

- Prettier
- ESLint
- Biome
- Stylelint
- Vitest
- ktlint
- actionlint
- lint-staged

## How to use

Install it:

    yarn add -D @naturalcycles/dev-lib

This unlocks all commands listed below, e.g:

    yarn dev-lib test
    yarn dev-lib lint

`yarn dev-lib` runs "interactive mode" that lets you explore available commands.

By default, it uses default configs for Prettier, ESLint, Stylelint, that are included in this
package (for convenience). You can override them by putting your own `prettier.config.js`,
`eslint.config.js`, `stylelint.config.js` in the root folder of your project.

UPD: these tools/linters would use default configs if absent:

- commitlint
- lint-staged

These tools require a respective config to run, otherwise they're not run. List of configs:

- `vitest.config.js`
- `prettier.config.js`
- `eslint.config.js` (eslint FLAT config)
- `stylelint.config.js`

## Conventions

Primary language: TypeScript (`*.ts`).

All files are linted and _prettified_ upon commit (using `husky`, `lint-staged` and `prettier`).

### Folder structure

- `/dist` target dir to put compiled files into (`*.js` and additional files like `*.json`)
- `/dist-cjs` target for CommonJS files
- `/dist-esm` target for ES Modules
- `/src` for all source files
- `/scripts` for all non-production source files / scripts.
- `/src/test` for generic test-related files and utilities, integration tests.
- `/src/test/mock`
- `/src/@types`
- `/src/env`
- `/cfg` conventional folder to store and publish shared configs. E.g. shared `tsconfig.json` or
  such.
- `/resources` files that will be published to npm, but that are not "source code". E.g. json files,
  schemas, configs, etc.
- `/coverage` for unit test coverage
- `/tmp`
  - `/jest/unit.xml`
  - `/jest/integration.xml`
  - `/coverage-integration`
- `/docs` for Docs (convention followed by Github Pages, Conventional commits, Vitepress, etc)

### Yarn commands

These commands are available to be called as `yarn dev-lib <command>`.

#### Build commands

- `build`: "Production build". Does `del ./dist && build-copy && tsc-prod`
- `bt`: "Build & Test". Does `del ./dist && tsc && tsc-scripts && test`
- `typecheck`: Runs `tsc` in all folders (src, scripts, e2e).
- `check`: "Lint, Build & Test". Does `lint && typecheck && test`

#### Test commands

There are 3 categories of tests supported:

- Unit tests (default) `*.test.ts`
- Integration tests `*.integration.test.ts`
- Manual tests `*.manual.test.ts`

Unit tests are default. All tests are run on `yarn dev-lib test`.

Integration tests (optional) allow to have a setup file (`src/test/setupJest.integration.ts`) where
you can define separate environment settings. You can use it to run so-called "integration tests" -
tests that interface with outside world (network, DB, APIs, etc). While unit tests are restricted to
not use network calls.

Manual tests (optional) are sub-category of integration tests that you never want to run
automatically in any environment. They're useful to run tests manually every now and then.

All test commands set `TZ=UTC`. You can override it by providing `TZ` env variable **before**
running a test command. Adds `APP_ENV=test` env var (for all runs except integration). Automatically
adds `--silent` (and `TEST_SILENT` env var) if all tests are run.

- `test`: runs unit tests (all tests _except_ `*.integration.test.ts` and `*.manual.test.ts`).
  Detects `CI` env variable, adds `--coverage` if in CI. Uses `default` reporter in `!CI`, otherwise
  `jest-junit` reporter.
- `test-integration`: runs `*.integration.test.ts` with `jest.integration-test.config.js` config.
- `test-manual`: runs `*.manual.test.ts` with `jest.manual-test.config.js`.
- `test-leaks`: runs Jest with `--logHeapUsage --detectOpenHandles --detectLeaks`.

For unit tests (`yarn test`) these `setupFilesAfterEnv` will be used (if found) in that order:

- `<rootDir>/src/test/setupVitest.ts`
- `<rootDir>/src/test/setupVitest.unit.ts`

For integration tests (`yarn test-integration`) these `setupFilesAfterEnv` will be used (if found)
in that order:

- `<rootDir>/src/test/setupVitest.ts`
- `<rootDir>/src/test/setupVitest.integration.ts`

For manual tests:

- `<rootDir>/src/test/setupVitest.ts`
- `<rootDir>/src/test/setupVitest.manual.ts`

#### Lint commands

- `lint`: runs Biome, ESLint, Stylelint, Prettier, actionlint, ktlint in the right order.
  - `--commitOnChanges` will commit lint-modified changes and push them
  - `--failOnChanges` will exit with status 1 in the end (will fail the command)

- `eslint`: runs `eslint` on needed paths
- `biome`: runs `biome` on needed paths
- `stylelint`: runs `stylelint` on needed paths
- `prettier`: runs just Prettier on needed paths

Pass `--no-fix` (or `--fix=false`) to disable the default `--fix` flag on linters. Useful to debug a
linter, or when linter behaves badly and corrupts your files (just happened to me with
`eslint-plugin-vue`).

Pass `--ext` (e.g `--ext ts,html`) to override the list of ESLint extensions (default is
`ts,tsx,vue` right now).

For Stylelint to be run, you need to manually install it in the target project:

`yarn add -D stylelint stylelint-config-standard-scss`

For Biome to run you need to install it like this:

`yarn add -D @biomejs/biome`

and add `biome.jsonc` config to the root.

##### ktlint

`ktlint` will be used by lint-staged for all `**/*.{kt,kts}` files.

~~Please install it with `brew install ktlint`.~~

Install it **locally** in you project by adding
[`@naturalcycles/ktlint`](https://github.com/NaturalCycles/ktlint) to your **dev**Dependencies.

#### Other commands

- `up`: shortcut for `yarn upgrade` && `yarn patch-package` (if `patch-package` exists in the
  project).

## Non-extendable config files

These files cannot be _extended_, so they are instead copied into the target project: first time
when seeding the project, later manually by running `yarn update-from-dev-lib`.

These files are **overwritten** in target project every time the mentioned command is run. So, be
careful! Solution is to either extend them in other way (e.g put more `.gitignore` files in
subfolders), OR PR to this project, if the need is generic.

- `.editorconfig`
- `.gitignore`
- `.codeclimate.yml` (with some work it can be made extendable later)

## Extendable config files

These files are meant to be extended in target project, so act as _recommended defaults_.

- `husky.config.js`
- `lint-staged.config.js`
- `prettier.config.js`
- `eslint.config.js`
- `biome.jsonc`
- `jest.config.js`
- `vitest.config.mjs`

## eslint

Presence of `jest` is detected by checking if `node_modules/jest` exists.

If exists - `eslint-plugin-jest` recommended config (plus opinionated `dev-lib`'s rules) are
enabled. Otherwise disabled ( to not cause "jest not found" errors).
