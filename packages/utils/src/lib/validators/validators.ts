/**
 * Type guard for `null | undefined`.
 *
 * @example
 * ```ts
 * values.filter(isNil); // (T | null | undefined)[] -> (null | undefined)[]
 * ```
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Negation of {@link isNil}. Useful as a `.filter` predicate for narrowing
 * `(T | null | undefined)[]` to `T[]`.
 */
export function notNil<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** Type guard for callable functions. */
export function isFunction(value: unknown): value is CallableFunction {
  return typeof value === 'function';
}

/**
 * Asserts that `value` is not `null | undefined`, throwing otherwise.
 * Narrows in-place — preferable to `if (!x) throw` at call sites.
 *
 * @remarks
 * Throws a generic `TypeError` by default. Pass a `message` for context.
 */
export function assertNotNil<T>(
  value: T | null | undefined,
  message = 'Expected value to be defined',
): asserts value is T {
  if (value === null || value === undefined) {
    throw new TypeError(message);
  }
}

/** Type guard for non-empty strings (after optional trim). */
export function isNonEmptyString(
  value: unknown,
  {trim = false}: {trim?: boolean} = {},
): value is string {
  if (typeof value !== 'string') return false;
  return (trim ? value.trim() : value).length > 0;
}

/** Type guard for non-empty arrays. Narrows to a tuple with at least one element. */
export function isNonEmptyArray<T>(
  value: readonly T[] | null | undefined,
): value is readonly [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

const nonRecords = new Set([
  WeakSet,
  WeakMap,
  Promise,
  Date,
  Error,
  RegExp,
  ArrayBuffer,
  DataView,
  Function,
]);

/**
 * Type guard for plain object literals (those with `Object.prototype` or a
 * `null` prototype). Excludes arrays, class instances, `Map`, `Set`, `Date`, etc.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || isIterable(value)) {
    return false;
  }

  let proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype) {
    return true;
  }

  while (proto && proto !== Object.prototype) {
    if (nonRecords.has(proto.constructor)) {
      return false;
    }
    proto = Object.getPrototypeOf(proto);
  }

  return proto === Object.prototype;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIterable(value: any): value is Iterable<any> {
  return typeof value?.[Symbol.iterator] === 'function';
}
