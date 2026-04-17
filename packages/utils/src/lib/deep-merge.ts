import type {DeepPartial} from './types/recursion-types';
import {isNil, isRecord} from './validators/validators';

/** Options controlling merge behavior. */
export interface DeepMergeOptions {
  /**
   * How to merge array values.
   * - `'replace'` (default): patch array fully replaces target array.
   * - `'concat'`: patch array is appended to target array.
   *
   * @defaultValue `'replace'`
   */
  readonly arrays?: 'replace' | 'concat';

  /**
   * Whether `undefined` values in patches overwrite target values.
   * - `false` (default): `undefined` entries are skipped, preserving target.
   * - `true`: `undefined` explicitly erases the target value.
   *
   * @defaultValue `false`
   */
  readonly overwriteWithUndefined?: boolean;
}

/**
 * Deeply merges one or more patches into a target, returning a new object.
 * Never mutates the target.
 */
export function deepMerge<T extends object>(
  target: T,
  ...patches: readonly (DeepPartial<NoInfer<T>> | null | undefined)[]
): T;
export function deepMerge<T extends object>(
  target: T,
  options: DeepMergeOptions,
  ...patches: readonly (DeepPartial<NoInfer<T>> | null | undefined)[]
): T;
export function deepMerge<T extends object>(
  target: T,
  optionsOrPatch: DeepMergeOptions | DeepPartial<T> | null | undefined,
  ...rest: readonly (DeepPartial<T> | null | undefined)[]
): T {
  const {options, patches} = splitArgs(optionsOrPatch, rest);

  // Fast path: no meaningful patches.
  if (patches.every(isNil)) return deepClone(target);

  const result = deepClone(target);
  for (const patch of patches) {
    if (isNil(patch)) continue;
    mergeInto(result as never, patch as never, options, new WeakSet());
  }
  return result;
}

/**
 * Deep clone for plain records, arrays, Maps, Sets, and Dates. Built-in
 * types that can't be meaningfully cloned (RegExp, Error, Promise, etc.)
 * are returned by reference.
 */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fall through — structuredClone throws on functions, DOM nodes, etc.
    }
  }
  return manualClone(value, new WeakMap());
}

// ---------- internals ----------

function splitArgs<T extends object>(
  head: DeepMergeOptions | DeepPartial<T> | null | undefined,
  rest: readonly (DeepPartial<T> | null | undefined)[],
): {options: Required<DeepMergeOptions>; patches: readonly (DeepPartial<T> | null | undefined)[]} {
  const defaults: Required<DeepMergeOptions> = {
    arrays: 'replace',
    overwriteWithUndefined: false,
  };
  if (isMergeOptions(head)) {
    return {options: {...defaults, ...head}, patches: rest};
  }
  return {options: defaults, patches: [head, ...rest]};
}

function isMergeOptions(value: unknown): value is DeepMergeOptions {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false; // empty object is ambiguous — treat as patch
  return keys.every((k) => k === 'arrays' || k === 'overwriteWithUndefined');
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function mergeInto(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
  options: Required<DeepMergeOptions>,
  seen: WeakSet<object>,
): void {
  if (seen.has(patch)) return;
  seen.add(patch);

  for (const key of Object.keys(patch)) {
    if (UNSAFE_KEYS.has(key)) continue;

    const patchVal = patch[key];

    if (patchVal === undefined && !options.overwriteWithUndefined) continue;

    const targetVal = target[key];

    if (isRecord(patchVal) && isRecord(targetVal)) {
      mergeInto(targetVal, patchVal, options, seen);
      continue;
    }

    if (options.arrays === 'concat' && Array.isArray(patchVal) && Array.isArray(targetVal)) {
      target[key] = [...targetVal, ...patchVal.map((v) => deepClone(v))];
      continue;
    }

    target[key] = deepClone(patchVal);
  }
}

function manualClone<T>(value: T, seen: WeakMap<object, unknown>): T {
  if (value === null || typeof value !== 'object') return value;

  const obj = value as unknown as object;
  const cached = seen.get(obj);
  if (cached !== undefined) return cached as T;

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    seen.set(obj, out);
    for (const item of value) out.push(manualClone(item, seen));
    return out as T;
  }

  if (value instanceof Date) return new Date(value.getTime()) as T;

  if (value instanceof Map) {
    const out = new Map();
    seen.set(obj, out);
    for (const [k, v] of value) out.set(manualClone(k, seen), manualClone(v, seen));
    return out as T;
  }

  if (value instanceof Set) {
    const out = new Set();
    seen.set(obj, out);
    for (const item of value) out.add(manualClone(item, seen));
    return out as T;
  }

  if (!isRecord(value)) return value; // opaque — pass by reference

  const out: Record<string, unknown> = {};
  seen.set(obj, out);
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) continue;
    out[key] = manualClone((value as Record<string, unknown>)[key], seen);
  }
  return out as T;
}
