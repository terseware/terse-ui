/** Unwraps an array or readonly array type to its element type. Passes other types through. */
export type UnArray<T> = T extends readonly (infer U)[] ? U : T;

/** Unwraps a `Set<U>` to `U`. Passes other types through (use {@link UnSetStrict} for `never`). */
export type UnSet<T> = T extends Set<infer U> ? U : T extends ReadonlySet<infer U> ? U : T;

/** Strict variant of {@link UnSet} — returns `never` when `T` is not a Set. */
export type UnSetStrict<T> = T extends ReadonlySet<infer U> ? U : never;

/** Unwraps `Promise<U>` / `PromiseLike<U>` / `Awaited` to `U`. Wrapper around built-in `Awaited`. */
export type UnPromise<T> = Awaited<T>;

/** Unwraps `Map<K, V>` to `[K, V]`. Passes other types through. */
export type UnMap<T> = T extends ReadonlyMap<infer K, infer V> ? [K, V] : T;

/** Dual of `keyof` — the union of a type's value types. */
export type ValueOf<T> = T[keyof T];

/** Typed `Object.entries` return type. */
export type Entries<T> = {[K in keyof T]: [K, T[K]]}[keyof T][];

/** Strips keys whose value type is `never`. */
export type OmitNever<T> = {[K in keyof T as [T[K]] extends [never] ? never : K]: T[K]};

/** Picks keys whose value type extends `V`. */
export type PickByValue<T, V> = {[K in keyof T as T[K] extends V ? K : never]: T[K]};

/** Omits keys whose value type extends `V`. */
export type OmitByValue<T, V> = {[K in keyof T as T[K] extends V ? never : K]: T[K]};

/** Makes `K` keys required in `T`. */
export type WithRequired<T, K extends keyof T> = T & {[P in K]-?: T[P]};

/** Makes `K` keys optional in `T`. */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & {[P in K]?: T[P]};

/**
 * Forces TypeScript to expand a type inline for readable hover output.
 */
export type Prettify<T> = {[K in keyof T]: T[K]} & {};

/** Recursive {@link Prettify}. Walks into nested record types only. */
export type Simplify<T> = T extends object
  ? T extends infer O
    ? {[K in keyof O]: Simplify<O[K]>}
    : never
  : T;

/**
 * Distributive `T | U` that preserves `U`'s autocomplete when `T` is a
 * string/number literal union. See microsoft/TypeScript#29729.
 */
export type LooseAutocomplete<T, Base> = T | (Base & {__ignore?: never});

/**
 * Tests whether `T` is exactly `any`. Returns `Yes` if so, else `No`.
 *
 * @remarks
 * Relies on the fact that `any` is assignable both to and from `0 extends 1`.
 */
export type IfAny<T, Yes, No> = 0 extends 1 & T ? Yes : No;

/** Tests whether `T` is exactly `never`. */
export type IsNever<T> = [T] extends [never] ? true : false;

/** Tests whether `T` is exactly `unknown`. */
export type IsUnknown<T> = IfAny<T, false, unknown extends T ? true : false>;

/**
 * Converts a union `A | B | C` to an intersection `A & B & C`.
 */
export type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;

/** Converts a tuple to a union of its elements. Alias for indexed access with `number`. */
export type TupleToUnion<T extends readonly unknown[]> = T[number];

declare const brand: unique symbol;

/**
 * Brands `T` with nominal tag `B`. Produces a structural type that is
 * nominally distinct from other brands.
 * ```
 */
export type Branded<T, B extends string> = T & {readonly [brand]: B};

/**
 * Narrows `T` to `Shape` with zero extra keys.
 */
export type Exact<T, Shape> = T extends Shape
  ? {[K in keyof T]: K extends keyof Shape ? T[K] : never}
  : Shape;
