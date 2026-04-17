import {runInInjectionContext, type Injector} from '@angular/core';
import {deepMerge} from './deep-merge';
import type {Fn, MaybeFn} from './types/primitive-types';
import type {DeepPartial} from './types/recursion-types';

/**
 * Resolves a {@link MaybeFn} — returns it directly, or calls it with `args` if it is a function.
 */
export function unwrap<T, A extends unknown[] = never[]>(val: MaybeFn<T, A>, ...args: A): T {
  return typeof val === 'function' ? (val as Fn<T, A>)(...args) : val;
}

/**
 * {@link unwrap} evaluated inside `injector`. Skips the injection-context
 * setup entirely when `val` is not a function.
 */
export function unwrapIn<T, A extends unknown[] = never[]>(
  injector: Injector,
  val: MaybeFn<T, A>,
  ...args: A
): T {
  if (typeof val !== 'function') return val;
  return runInInjectionContext(injector, () => (val as Fn<T, A>)(...args));
}

/**
 * Deep-merges a default value with zero or more partial overrides, any of
 * which may be lazy (a function producing the value).
 */
export function unwrapMerge<T extends object>(
  defaultValue: MaybeFn<T, []>,
  ...overrides: readonly MaybeFn<DeepPartial<NoInfer<T>> | null | undefined, []>[]
): T {
  return deepMerge(unwrap(defaultValue), ...overrides.map((v) => unwrap(v)));
}

/** {@link unwrapMerge} with all lazy values evaluated inside `injector`. */
export function unwrapMergeIn<T extends object>(
  injector: Injector,
  defaultValue: MaybeFn<T>,
  ...overrides: readonly MaybeFn<DeepPartial<NoInfer<T>> | null | undefined, []>[]
): T {
  return deepMerge(
    unwrapIn(injector, defaultValue),
    ...overrides.map((v) => unwrapIn(injector, v)),
  );
}
