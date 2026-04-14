import type {DeepPartial} from '../typings';
import {isNil, isPlainObject} from '../validators';

export function deepMerge<T>(
  target: T,
  ...patches: (DeepPartial<NoInfer<T>> | null | undefined)[]
): T {
  let result = clone(target);
  for (const patch of patches) {
    if (isNil(patch)) continue;
    if (isPlainObject(result) && isPlainObject(patch)) {
      merge(result, patch);
    } else {
      result = clone(patch) as T;
    }
  }
  return result;
}

function clone<T>(value: T): T {
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    out[key] = clone(value[key]);
  }
  return out as T;
}

function merge(target: Record<string, unknown>, patch: Record<string, unknown>): void {
  for (const key of Object.keys(patch)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const patchVal = patch[key];
    if (isPlainObject(patchVal) && isPlainObject(target[key])) {
      merge(target[key], patchVal);
    } else {
      target[key] = patchVal;
    }
  }
}
