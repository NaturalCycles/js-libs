## @naturalcycles/scrubber-lib

> Scrub data in JavaScript plain objects by using rules defined in a configuration object

[![npm](https://img.shields.io/npm/v/@naturalcycles/scrubber-lib/latest.svg)](https://www.npmjs.com/package/@naturalcycles/scrubber-lib)
[![Maintainability](https://api.codeclimate.com/v1/badges/e8cd5b1b7cff8e1296fe/maintainability)](https://codeclimate.com/repos/e8cd5b1b7cff8e1296fe/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/e8cd5b1b7cff8e1296fe/test_coverage)](https://codeclimate.com/repos/e8cd5b1b7cff8e1296fe/test_coverage)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## How to use

Install it:

```
yarn add -D @naturalcycles/scrubber-lib
```

Define a scrubber configuration object:

```ts
import { ScrubberConfig, Scrubber } from '@naturalcycles/scrubber-lib'

const cfg: ScrubberConfig = {
  fields: {
    name: {
      scrubber: 'staticScrubber',
      params: {
        replacement: 'John Doe',
      },
    },
    password: {
      scrubber: 'undefinedScrubber',
    },
  },
  throwOnError: true, // default: false,
  preserveFalsy: false, // default: true
}
```

Scrub a single object:

```ts
const object = { name: 'Real Name', password: 'secret' }

const scrubber = new Scrubber(cfg)
const scrubbedObject = scrubber.scrub(object)

// scrubbedObject =  name: 'John Doe', password: undefined }
```

Scrub an array of objects:

```ts
const objects = [object1, object2, object3]

const scrubbedObjects = scrubber.scrub(objects)
```

## Public API

```ts
constructor (private cfg: ScrubberConfig, additionalScrubbersImpl?: ScrubbersImpl)
scrub<T> (data: T): T
```

## Features

- **Objects are deep traversed**
- **Immutable** changes (does not mutate the original object)
- TypeScript library, compatible both on browsers and NodeJS
- Fields are scrubbed if object keys match the field names on the configuration file
- Provides a few built-in scrubber functions
- Allows additional scrubber functions
- Validates config object on class initialization to ensure all defined scrubber functions exist
- Supports field names to be comma-separated on configuration file
- Error handling: all errors are logged and allows a `cfg.throwOnError` optional configuration to
  re-throw errors
- Falsy values: allows a `cfg.preserveFalsy` optional configuration to control if falsy values
  should be preserved or passed to scrubber functions. When inspecting scrubbed objects for
  debugging purposes, it might be useful to set it to `true` to identify potential interesting
  fields
- [since 2.9] - support matching key only if parent key name(s) also match. Supported using dots `.`
  in key name. Config with key `a.b` will match object key literally AND it will match object key
  `b` if parent object key was `a`. Works at arbitrary depth. LIMITATION: parent matching currently
  assumes final key (`b`) is unique. If multiple parent references end with the same key (e.g. `a.b`
  & `c.b`), only last one will work.

## Limitations

- Objects of types `Map`, `Set` and `Buffer` are currently not traversed or modified

## Vocabulary

The `scrubber-lib` supports a `ScrubberConfig` parameter on initialization which is usually defined
by clients on a `scrubber configuration file` (YAML or JSON) with multiple `scrubbing profiles`
(such as anonymization, pseudonymization, etc).

The library applies `scrubber functions` to the given objects. It provides some built-in
`scrubber functions` while also allowing custom `scrubber functions implementations`.

## Possible use cases

Allows, for example, removal of sensitive data for:

- Logs
- Error reporting to third-party services
- Data exports (such as staging or other data exports)
- Anonymizing production users (GDPR "_right to be forgotten_")

## Contributing

Using [Semantic Release](https://github.com/semantic-release/semantic-release), tag your commit
(when squashing the PR on merge) according to
[Angular Commit Message Guidelines](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md)
with type (and optionally `(scope)`, as in, `fix(data): Description`.
