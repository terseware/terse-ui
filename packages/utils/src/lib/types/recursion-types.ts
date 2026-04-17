/**
 * Types that should NOT be recursed into by deep mappers. Includes built-in
 * collections (handled explicitly via {@link DeepReadonly} etc.), primitives
 * wrapped as objects, functions, and opaque host types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BuiltIn = Date | Error | RegExp | ArrayBuffer | DataView | Promise<any> | Function; // eslint-disable-line @typescript-eslint/no-unsafe-function-type

/**
 * True when `T` is a plain record object we should recurse into. Excludes
 * arrays/tuples (handled specially), Maps/Sets (handled specially), and
 * built-in opaque types.
 */
export type IsRecord<T> = T extends object
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends readonly any[] | ReadonlyMap<any, any> | ReadonlySet<any> | BuiltIn
    ? false
    : true
  : false;

/**
 * True when `T` is a plain record with at least one known (non-index-signature)
 * key — the condition under which nested deep-signal access makes sense.
 */
export type IsKnownRecord<T> = IsRecord<T> extends true ? HasKnownKeys<T> : false;

/**
 * True when `T` has any known (non-index-signature) keys.
 *
 * @remarks
 * A type like `Record<string, number> & {foo: boolean}` has both a string
 * index signature AND a known key `foo`; this returns `true` for it, because
 * even one concrete key is enough to warrant deep treatment.
 */
export type HasKnownKeys<T> = keyof T extends infer K
  ? K extends keyof T
    ? string extends K
      ? false
      : number extends K
        ? false
        : symbol extends K
          ? false
          : true
    : false
  : false;

/**
 * Recursive `Readonly<T>`. Descends into plain records, arrays, tuples,
 * Maps, and Sets. Built-in types like `Date` and `RegExp` are left alone
 * because they cannot be meaningfully deep-frozen at the type level.
 */
export type DeepReadonly<T> = T extends BuiltIn
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends readonly (infer U)[]
        ? T extends readonly [unknown, ...unknown[]] | readonly [...unknown[], unknown]
          ? {readonly [K in keyof T]: DeepReadonly<T[K]>} // tuple: preserve positions
          : readonly DeepReadonly<U>[]
        : IsRecord<T> extends true
          ? {readonly [K in keyof T]: DeepReadonly<T[K]>}
          : T;

/**
 * Recursive `Partial<T>`. Descends into plain records, arrays, tuples,
 * Maps, and Sets. Built-in types are left alone.
 */
export type DeepPartial<T> = T extends BuiltIn
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepPartial<K>, DeepPartial<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepPartial<U>>
      : T extends readonly (infer U)[]
        ? T extends readonly [unknown, ...unknown[]] | readonly [...unknown[], unknown]
          ? {[K in keyof T]?: DeepPartial<T[K]>}
          : DeepPartial<U>[]
        : IsRecord<T> extends true
          ? {[K in keyof T]?: DeepPartial<T[K]>}
          : T;

/**
 * Recursive `Required<T>`. Descends into plain records, arrays, tuples,
 * Maps, and Sets. Built-in types are left alone.
 */
export type DeepRequired<T> = T extends BuiltIn
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepRequired<K>, DeepRequired<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepRequired<U>>
      : T extends readonly (infer U)[]
        ? T extends readonly [unknown, ...unknown[]] | readonly [...unknown[], unknown]
          ? {[K in keyof T]-?: DeepRequired<T[K]>}
          : DeepRequired<U>[]
        : IsRecord<T> extends true
          ? {[K in keyof T]-?: DeepRequired<T[K]>}
          : T;

/**
 * Recursive `Writable<T>` — strips `readonly` modifiers at every depth.
 * Complement to {@link DeepReadonly}.
 */
export type DeepWritable<T> = T extends BuiltIn
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepWritable<K>, DeepWritable<V>>
    : T extends ReadonlySet<infer U>
      ? Set<DeepWritable<U>>
      : T extends readonly (infer U)[]
        ? T extends readonly [unknown, ...unknown[]] | readonly [...unknown[], unknown]
          ? {-readonly [K in keyof T]: DeepWritable<T[K]>}
          : DeepWritable<U>[]
        : IsRecord<T> extends true
          ? {-readonly [K in keyof T]: DeepWritable<T[K]>}
          : T;
