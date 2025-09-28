/* eslint-disable */

/**
 Flatten the type output to improve type hints shown in editors.
 */
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] }

/**
 Returns a boolean for whether the two given types are equal.
 @link https://github.com/microsoft/TypeScript/issues/27024#issuecomment-421529650
 @link https://stackoverflow.com/questions/68961864/how-does-the-equals-work-in-typescript/68963796#68963796
 */
export type IsEqual<T, U> =
  (<G>() => G extends T ? 1 : 2) extends <G>() => G extends U ? 1 : 2 ? true : false

/**
 * Filter out keys from an object.
 * Returns `never` if `Exclude` is strictly equal to `Key`.
 * Returns `never` if `Key` extends `Exclude`.
 * Returns `Key` otherwise.
 */
type Filter<KeyType, ExcludeType> =
  IsEqual<KeyType, ExcludeType> extends true ? never : KeyType extends ExcludeType ? never : KeyType

/**
 Create a type from an object type without certain keys.

 This type is a stricter version of [`Omit`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-5.html#the-omit-helper-type). The `Omit` type does not restrict the omitted keys to be keys present on the given type, while `Except` does. The benefits of a stricter type are avoiding typos and allowing the compiler to pick up on rename refactors automatically.

 This type was proposed to the TypeScript team, which declined it, saying they prefer that libraries implement stricter versions of the built-in types ([microsoft/TypeScript#30825](https://github.com/microsoft/TypeScript/issues/30825#issuecomment-523668235)).

 @example
 ```
 import {Except} from 'type-fest';

 type Foo = {
	a: number;
	b: string;
	c: boolean;
};

 type FooWithoutA = Except<Foo, 'a' | 'c'>;
 //=> {b: string};
 ```
 */
export type Except<ObjectType, KeysType extends keyof ObjectType> = {
  [KeyType in keyof ObjectType as Filter<KeyType, KeysType>]: ObjectType[KeyType]
}

/**
 * Pick only index signatures from the given object type, leaving out all explicitly defined properties.
 * This is the counterpart of `OmitIndexSignature`.
 * When you use a type that will iterate through an object that has indexed keys and explicitly defined keys you end up with a type where only the indexed keys are kept. This is because `keyof` of an indexed type always returns `string | number | symbol`, because every key is possible in that object. With this type, you can save the indexed keys and reinject them later, like in the second example below.
 */
export type PickIndexSignature<ObjectType> = {
  [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
    ? KeyType
    : never]: ObjectType[KeyType]
}

/**
 * Omit any index signatures from the given object type, leaving only explicitly defined properties.
 * This is the counterpart of `PickIndexSignature`.
 * Use-cases:
 * - Remove overly permissive signatures from third-party types.
 *
 * This type was taken from this [StackOverflow answer](https://stackoverflow.com/a/68261113/420747).
 * It relies on the fact that an empty object (`{}`) is assignable to an object with just an index signature, like `Record<string, unknown>`, but not to an object with explicitly defined keys, like `Record<'foo' | 'bar', unknown>`.
 * (The actual value type, `unknown`, is irrelevant and could be any type. Only the key type matters.)
 */
export type OmitIndexSignature<ObjectType> = {
  [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
    ? never
    : KeyType]: ObjectType[KeyType]
}

/**
 Merge two types into a new type. Keys of the second type overrides keys of the first type.

 @example
 ```
 import {Merge} from 'type-fest';

 type Foo = {
	a: number;
	b: string;
};

 type Bar = {
	b: number;
};

 const ab: Merge<Foo, Bar> = {a: 1, b: 2};
 ```
 */
export type Merge<Destination, Source> = {
  [Key in keyof OmitIndexSignature<Destination & Source>]: Key extends keyof Source
    ? Source[Key]
    : Key extends keyof Destination
      ? Destination[Key]
      : never
} & PickIndexSignature<Destination & Source>

/**
 Extract the keys from a type where the value type of the key extends the given `Condition`.
 Internally this is used for the `ConditionalPick` and `ConditionalExcept` types.
 @example
 ```
 import {ConditionalKeys} from 'type-fest';
 interface Example {
	a: string;
	b: string | number;
	c?: string;
	d: {};
}
 type StringKeysOnly = ConditionalKeys<Example, string>;
 //=> 'a'
 ```
 To support partial types, make sure your `Condition` is a union of undefined (for example, `string | undefined`) as demonstrated below.
 @example
 ```
 type StringKeysAndUndefined = ConditionalKeys<Example, string | undefined>;
 //=> 'a' | 'c'
 ```
 */
export type ConditionalKeys<Base, Condition> = NonNullable<
  // Wrap in `NonNullable` to strip away the `undefined` type from the produced union.
  {
    // Map through all the keys of the given base type.
    [Key in keyof Base]: Base[Key] extends Condition // Pick only keys with types extending the given `Condition` type.
      ? // Retain this key since the condition passes.
        Key
      : // Discard this key since the condition fails.
        never

    // Convert the produced object into a union type of the keys which passed the conditional test.
  }[keyof Base]
>

/**
 Exclude keys from a shape that matches the given `Condition`.
 This is useful when you want to create a new type with a specific set of keys from a shape. For example, you might want to exclude all the primitive properties from a class and form a new shape containing everything but the primitive properties.
 @example
 ```
 import {Primitive, ConditionalExcept} from 'type-fest';
 class Awesome {
	name: string;
	successes: number;
	failures: bigint;
	run() {}
}
 type ExceptPrimitivesFromAwesome = ConditionalExcept<Awesome, Primitive>;
 //=> {run: () => void}
 ```
 @example
 ```
 import {ConditionalExcept} from 'type-fest';
 interface Example {
	a: string;
	b: string | number;
	c: () => void;
	d: {};
}
 type NonStringKeysOnly = ConditionalExcept<Example, string>;
 //=> {b: string | number; c: () => void; d: {}}
 ```
 */
export type ConditionalExcept<Base, Condition> = Except<Base, ConditionalKeys<Base, Condition>>

/**
 Pick keys from the shape that matches the given `Condition`.
 This is useful when you want to create a new type from a specific subset of an existing type. For example, you might want to pick all the primitive properties from a class and form a new automatically derived type.
 @example
 ```
 import {Primitive, ConditionalPick} from 'type-fest';
 class Awesome {
	name: string;
	successes: number;
	failures: bigint;
	run() {}
}
 type PickPrimitivesFromAwesome = ConditionalPick<Awesome, Primitive>;
 //=> {name: string; successes: number; failures: bigint}
 ```
 @example
 ```
 import {ConditionalPick} from 'type-fest';
 interface Example {
	a: string;
	b: string | number;
	c: () => void;
	d: {};
}
 type StringKeysOnly = ConditionalPick<Example, string>;
 //=> {a: string}
 ```
 */
export type ConditionalPick<Base, Condition> = Pick<Base, ConditionalKeys<Base, Condition>>

/**
 Matches any [typed array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray), like `Uint8Array` or `Float64Array`.
 */
export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array

declare global {
  interface SymbolConstructor {
    readonly observable: symbol
  }
}

/**
 Matches a value that is like an [Observable](https://github.com/tc39/proposal-observable).
 */
export interface ObservableLike {
  subscribe(observer: (value: unknown) => void): void
  [Symbol.observable](): ObservableLike
}
