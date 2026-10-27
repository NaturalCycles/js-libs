## @naturalcycles/pnpm-config

> Shared pnpm settings, consumed as a pnpm [config dependency](https://pnpm.io/config-dependencies)
> via [config includes](https://pnpm.io/config-includes).

[![npm](https://img.shields.io/npm/v/@naturalcycles/pnpm-config/latest.svg)](https://www.npmjs.com/package/@naturalcycles/pnpm-config)

## Usage

Requires pnpm >= 12.16.0.

Add the package as a config dependency, then delegate settings to it in `pnpm-workspace.yaml`. A
config dependency always needs an explicit list of the settings it owns (`'*'` is only allowed for
local files):

```sh
pnpm add --config @naturalcycles/pnpm-config
```

```yaml
configDependencies:
  '@naturalcycles/pnpm-config': ^1.0.0 # written by `pnpm add --config`, integrity goes to the lockfile
include:
  '@naturalcycles/pnpm-config':
    - minimumReleaseAgeExclude
    - trustLockfile
    - trustPolicy
    - trustPolicyExcludePrune
```

The settings available for delegation are the ones defined in
[pnpm.config.yaml](./pnpm.config.yaml).

pnpm installs config dependencies before it loads their settings, so the `@naturalcycles/*` entry in
this package's `minimumReleaseAgeExclude` cannot exempt the package itself. pnpm applies a one-day
release age to config dependencies by default, so a fresh install (no `node_modules`, e.g. CI) fails
with `ERR_PNPM_BAD_CONFIG_DEP` for a day after each release of this package. Either pin it as
`version+integrity` (pins are not subject to the release age), or exempt it for the boot phase:

```yaml
bootConfig:
  minimumReleaseAgeExclude:
    - '@naturalcycles/*'
```

Each setting has exactly one owner: a delegated setting must not also be defined in your own
`pnpm-workspace.yaml`, or pnpm fails with `ERR_PNPM_DUPLICATE_SETTING`. Settings that you do not
delegate stay fully under your control.

## Notes

- This package must stay dependency-free: pnpm config dependencies cannot have `dependencies` or
  lifecycle scripts.
