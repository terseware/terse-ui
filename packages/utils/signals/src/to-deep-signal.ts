import type {Signal} from '@angular/core';
import {computed, isSignal, untracked} from '@angular/core';
import {isRecord, type IsKnownRecord} from '@terse-ui/utils';

/**
 * A {@link Signal} augmented with per-property signal access for known record
 * types. Nested records recurse; leaf properties and non-record types expose
 * a plain {@link Signal}.
 */
export type DeepSignal<T> = Signal<T> &
  (IsKnownRecord<T> extends true
    ? Readonly<{[K in keyof T]: IsKnownRecord<T[K]> extends true ? DeepSignal<T[K]> : Signal<T[K]>}>
    : unknown);

/** Marker so stale computed signals can be detected and cleaned up. */
const DEEP = /* @__PURE__ */ Symbol(
  typeof ngDevMode !== 'undefined' && ngDevMode ? 'DEEP_SIGNAL' : '',
);

/**
 * Wraps a {@link Signal} in a Proxy that exposes each property of a record
 * value as a lazily-created {@link computed} signal. Nested records are
 * wrapped recursively.
 *
 * Non-record values (primitives, arrays, Maps, Sets, Dates, etc.) pass
 * through unchanged — only plain objects with known keys get deep access.
 *
 * Per-property signals are cached on the signal function via
 * `Object.defineProperty`. When the data shape changes and a property
 * disappears, the stale computed is removed on next access.
 */

export function toDeepSignal<T>(signal: Signal<T>): DeepSignal<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler: ProxyHandler<any> = {
    has(target, prop) {
      return !!handler.get?.(target, prop, undefined);
    },
    get(target, prop) {
      const value = untracked(target);
      if (!isRecord(value) || !(prop in value)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (isSignal(target[prop]) && (target[prop] as any)[DEEP]) {
          delete target[prop];
        }
        return target[prop];
      }

      if (!isSignal(target[prop])) {
        Object.defineProperty(target, prop, {
          value: computed(() => target()[prop]),
          configurable: true,
        });
        target[prop][DEEP] = true;
      }

      return toDeepSignal(target[prop]);
    },
  };
  return new Proxy(signal, handler) as DeepSignal<T>;
}

/**
 * Wraps a {@link computed} signal in a Proxy that exposes each property of a
 * record value as a lazily-created {@link computed} signal. Nested records are
 * wrapped recursively.
 *
 * Non-record values (primitives, arrays, Maps, Sets, Dates, etc.) pass
 * through unchanged — only plain objects with known keys get deep access.
 */
export function deepComputed<T>(computation: () => T): DeepSignal<T> {
  return toDeepSignal(computed(computation));
}
