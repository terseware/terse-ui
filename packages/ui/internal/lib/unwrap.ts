import type {Injector} from '@angular/core';
import {runInInjectionContext} from '@angular/core';
import {deepMerge} from './deep-merge';
import type {DeepPartial, MaybeFn, MaybeProp} from './typings';
import {isFunction} from './validators';

/** Resolves `val` — returns it directly, or calls it with `args` if it's a function. */
export function unwrap<T, A extends unknown[] = never[]>(val: MaybeFn<T, A>, ...args: A): T {
  return isFunction(val) ? val(...args) : val;
}

/** {@link unwrap} evaluated inside the given injection context. */
export function unwrapInject<T, A extends unknown[] = never[]>(
  inj: Injector,
  val: MaybeFn<T, A>,
  ...args: A
): T {
  return runInInjectionContext(inj, () => unwrap(val, ...args));
}

/** Unwraps a default value and deep-merges any lazy partial overrides onto it. */
export function unwrapMerge<T extends object>(
  defaultValue: MaybeFn<T, []>,
  ...values: MaybeProp<DeepPartial<T>>[]
): T {
  return deepMerge(unwrap(defaultValue), ...values.map((x) => unwrap(x) ?? {})) as T;
}

/** {@link unwrapMerge} with all lazy values resolved in the given injector. */
export function unwrapMergeInject<T extends object>(
  injector: Injector,
  defaultValue: MaybeFn<T, []>,
  ...values: MaybeProp<DeepPartial<T>>[]
): T {
  return deepMerge(
    unwrapInject(injector, defaultValue),
    ...values.map((v) => unwrapInject(injector, v) ?? {}),
  ) as T;
}
