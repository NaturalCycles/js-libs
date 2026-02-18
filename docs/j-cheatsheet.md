# j Cheatsheet

Core rules and behaviors for `j` (AJV-based validation)

Basics

- `j.object<T>(...)` requires an explicit type; missing it yields `never` at compile time.
- `j.object.infer(...)` is for composition only; do not validate with it directly.
- Strict type matching: optional/required mismatches are compile-time errors.
- `j.enum(Enum)` supports both numeric and string enums; `j.enum([...])` for literal unions.
- `.isOfType<T>()` forces a schema/type check; mismatch yields `never`.
- `.castAs<T>()` overrides inferred input/output types without changing validation.

Objects

- Default: additional properties are stripped.
- Use `.allowAdditionalProperties()` to keep unknown keys.
- `j.object.record(keySchema, valueSchema)` returns `Record<K, V>` (strict typing).
- `j.object.withRegexKeys(...)` returns `StringMap<V>`; `j.object.stringMap(...)` is a shortcut.
- `j.object.dbEntity<T>(...)` expands `id/created/updated` and enforces a matching type.
- `.extend(...)` and `.concat(...)` preserve/merge types; use `.isOfType<T>()` to confirm final
  shape.
- `j.object.withEnumKeys(...)` creates an object with keys from an enum/array and value schema.

Optional and nullable

- `.optional()` adds `undefined` to the type.
- `.optional(values)` converts specific values to `undefined` (only when nested).
- `.nullable()` adds `null` to the type.

Transforms

- String transforms like `.trim()` and `.toLowerCase()` only apply when nested in an object or
  array.
- `j.set(...)` accepts any iterable input; output is a `Set`.
- `j.buffer()` accepts any Buffer input; output is a `Buffer`.
- Regex can set `{ msg }` or `{ name }` for a clearer error message.

Validation

- `schema.validate()` mutates input by default.
- Use `{ mutateInput: false }` to avoid mutation.
- `schema.create(schema).getValidationResult(...)` returns `[error, output]` (output may be
  transformed).
- `schema.validate()` strips unknown properties unless `.allowAdditionalProperties()` is set.

Where to look

- These files live under `packages/nodejs-lib/src/validation/ajv/`.
- `j` API + intent: `j.readme.md`
- Type behavior: `jsonSchemaBuilder.test.ts`
- Runtime behavior: `ajv.validations.test.ts` and `ajv.test.ts`
