# `j`

## and Silent Bob

### validate The Data

In this document you can learn about how to use `j`, our new validation library.

### Why?

Yet another validation library. But why? Main reasons:

1. Faster validation
2. Better DX
3. Stricter type validation
4. New types

**Faster validation** means that we can now start validating data that we used to ignore, because
validating them were very-very slow. For example: OuraSleepData.

It also means that we are more prepared for the accumulation of data that will happen with our own
devices like B1 and R1.

**Better DX** comes from the discoverable API, which means that one does not need to remember what
kind of schemas we usually import or use.

```ts
const oldWay = objectSchema<SomeType>({
  unix: unixTimestamp2000Schema(),
})

// 👆 You needed to know about importing `objectSchema` and `unixTimestamp2000Schema`
// as opposed to... 👇

const newWay = j.object<SomeType>({
  unix: j.number().unixTimestamp2000(),
})

// ... knowing to import `j`, and the rest is aided by auto-completion.
```

**Stricter type validation** (aka worse DX) means that the schema and the types need to match
exactly, unlike before where a required property could have had an optional schema.

```ts
interface Foo {
  foo: string
}

const oldWay = objectSchema<Foo>({ foo: stringSchema.optional() }) // ✅ Worked
const newWay = j.object<Foo>({ foo: j.string().optional() }) // ❌ Does not work anymore
```

And we also have **new types** in the schema, e.g.: Buffer, Set.

The novelty is that the new types support serialization and de-serialization, i.e. you can use
`j.set()` and when you know that the incoming data (from Datastore or from a Request) is an array,
it will convert the incoming data to a Set. And the same for `j.buffer()` - should you ever need
that.

```ts
const schema = j.object.infer({
  set: j.set(j.enum(DataFlags)), // accepts any Iterable input, output is Set<DataFlags> instance
  buffer: j.buffer(), // accepts any valid input for Buffer, output is a Buffer instance
})
```

### How to use `j` for validation?

While the API is very intuitive, there are some tips that can help with quick adoption:

1. When you want to use a specialized schema, first think about its underlying value:

```ts
const timestamp = j.number().unixTimestamp2000() // start with ".number"
const email = j.string().email() // start with ".string"
const date = j.string().isoDate() // start with ".string"
const dbRow = j.object.dbEntity({}) // start with ".object"
```

2. Many branded values have no shortcut (on purpose), usually those that come with no actual
   validation:

```ts
const accountId = j.string().accountId() // ❌
const accountId = j.string().branded<AccountId>() // ✅
```

3. Probably the most important: object schemas must have a type

```ts
const schema1 = j.object({ foo: j.string() }) // ❌
const schema2 = j.object<SomeType>({ bar: j.string(), nested: objectSchema1 }) // ✅
```

But because we do not always want to create a type or interface for every object schema, in those
cases it's possible to use inference via `j.object.infer()`:

```ts
const schema3 = j.object.infer({ foo: j.string() }) // { foo: string } is inferred
```

But these inferred schemas cannot be used for validation - only to be passed into other schemas. To
use inferred schemas in validation, you need to call `.ofType<SomeType>()` on them. If you forget,
there will be an error thrown when the first validation is about to happen.

```ts
const schema1 = j.object.infer({ foo: j.string() }) // ❌ Using `schema1` in validation would fail

const schema2 = j.object<SomeType>({ nestedProperty: schema1 }) // ✅ Using `schema1` inside another schema

const schema3 = j.object.infer({ foo: j.string() }).isOfType<{ foo: string }>() // ✅ Using `schema3`  for validation
```

This requirement is in place to enforce that we 1) have types for data that we validate, and 2) that
mismatches between types and schemas become visible as soon as possible.

If the typing has a mismatch, then the `schema`'s type will become `never`. When using
`j.object<SomeType>` the type error will be very helpful in identifying the mismatch. When using
`j.object.infer().isOfType()` the type error will be very unhelpful. Because of this,
`j.object<SomeType>` is the preferred choice.

4. In some cases you can specify a custom error message

When using regex validation, the resulting error message is generally not something we would want
the user to see. In many case, they are also not very helpful for developers either. So, when
running a regex validation, you can set a custom error message. This pattern can be extended to
other validator functions too, as we think it's necessary.

```ts
const schema = j.object({
  foo: j.string().regex(/\[a-z]{2,}\d?.+/, { msg: 'not a valid OompaLoompa! ' }),
})
// will produce an error like "Object.foo is not a valid OompaLoompa!"
```

### More about `j`

`j` is a JSON Schema builder that is developed in-house.

The validation is done by `ajv` which stands for Another JsonSchema Validator, an insanely fast
validation library.

`ajv` is hidden under the hood, and developers will mostly interact with `j`.
