import type {Signal} from '@angular/core';

/** A function of arity `A` returning `T`. */
export type Fn<T = unknown, A extends unknown[] = never[]> = (...args: A) => T;

/** Either a direct value or a function that produces one. */
export type MaybeFn<T = unknown, A extends unknown[] = never[]> = T | Fn<T, A>;

/** A nullable property that may also be lazily produced. */
export type MaybeProp<T, A extends unknown[] = never[]> = MaybeFn<T | null | undefined, A>;

/** Either a direct value or a signal that produces one. */
export type MaybeSignal<T> = T | Signal<T>;

/** Unwraps an array type to its element type. */
export type UnArray<T> = T extends (infer U)[] ? U : T;

/** Unwraps a set type to its literal type. */
export type UnSet<T> = T extends Set<infer U> ? U : never;

/** Strips keys whose value type is `never`. */
export type OmitNever<T> = {[K in keyof T as NonNullable<T[K]> extends never ? never : K]: T[K]};

/** Forces TypeScript to expand a type inline for readable hover output. */
export type Pretty<T> = {[K in keyof T]: T[K]} & {};

/** Distributive `T | U` that keeps `U`'s autocomplete. See ms/TypeScript#29729. */
export type Union<T, U> = T | (U & {});

/** Makes `K` keys required in `T`. */
export type WithRequired<T, K extends keyof T> = T & {[P in K]-?: T[P]};

declare const __brand: unique symbol;
/** Branding helper — tag a structural type so it's nominally distinct. */
export interface Brand<B> {
  [__brand]: B;
}
/** Brands `T` with nominal tag `B`. */
export type Branded<T, B> = T & Brand<B>;

/** Narrows `T` to `Shape` with zero extra keys, or `never`. */
export type Exact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
  : never;

/** Any concrete class constructor. */
export type Constructor<T extends object = object, A extends unknown[] = never[]> = A extends []
  ? new () => T
  : new (...args: A) => T;

/** Any abstract class constructor. */
export type AbstractConstructor<
  T extends object = object,
  A extends unknown[] = never[],
> = A extends [] ? abstract new () => T : abstract new (...args: A) => T;

/** Either a concrete or abstract class constructor. */
export type AnyConstructor<T extends object = object, A extends unknown[] = never[]> =
  | Constructor<T, A>
  | AbstractConstructor<T, A>;

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type BuiltIn = Primitive | Date | RegExp | Error | Fn;

/** Recursive `Partial<T>` that walks through collections and objects. */
export type DeepPartial<T> = T extends BuiltIn
  ? T
  : T extends Map<infer K, infer V>
    ? Map<K, DeepPartial<V>>
    : T extends Set<infer U>
      ? Set<DeepPartial<U>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<K, DeepPartial<V>>
        : T extends ReadonlySet<infer U>
          ? ReadonlySet<DeepPartial<U>>
          : T extends (infer U)[]
            ? DeepPartial<U>[]
            : T extends object
              ? {[P in keyof T]?: DeepPartial<T[P]>}
              : T;

/** Recursive `Required<T>` that walks through collections and objects. */
export type DeepRequired<T> = T extends BuiltIn
  ? T
  : T extends Map<infer K, infer V>
    ? Map<K, DeepRequired<V>>
    : T extends Set<infer U>
      ? Set<DeepRequired<U>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<K, DeepRequired<V>>
        : T extends ReadonlySet<infer U>
          ? ReadonlySet<DeepRequired<U>>
          : T extends (infer U)[]
            ? DeepRequired<U>[]
            : T extends object
              ? {[P in keyof T]-?: DeepRequired<T[P]>}
              : T;

/** True when `T` has no specific keys (index-signature only or empty). */
export type IsUnknownRecord<T> = keyof T extends never
  ? true
  : string extends keyof T
    ? true
    : symbol extends keyof T
      ? true
      : number extends keyof T
        ? true
        : false;

/** True when `T` is a record with known, concrete keys. */
export type IsKnownRecord<T> =
  IsRecord<T> extends true ? (IsUnknownRecord<T> extends true ? false : true) : false;

type NonRecord =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Iterable<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Iterable<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | WeakSet<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | WeakMap<any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Promise<any>
  | Date
  | Error
  | RegExp
  | ArrayBuffer
  | DataView
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  | Function;

/** True when `T` is a plain record object (not a built-in collection type). */
export type IsRecord<T> = T extends object ? (T extends NonRecord ? false : true) : false;

/** Recursive `Readonly<T>` that walks through collections and objects. */
export type DeepReadonly<T> = T extends BuiltIn
  ? T
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<K, DeepReadonly<V>>
    : T extends Set<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<K, DeepReadonly<V>>
        : T extends ReadonlySet<infer U>
          ? ReadonlySet<DeepReadonly<U>>
          : T extends (infer U)[]
            ? readonly DeepReadonly<U>[]
            : T extends object
              ? {readonly [P in keyof T]: DeepReadonly<T[P]>}
              : T;
