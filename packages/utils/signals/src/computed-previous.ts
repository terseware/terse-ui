import type {Signal} from '@angular/core';
import {linkedSignal} from '@angular/core';

/**
 * Creates a read-only {@link Signal} that tracks the previous value of
 * {@link source}. On the first read (before any change), returns the
 * current value.
 */
export function computedPrevious<T>(source: () => T): Signal<T> {
  return linkedSignal<T, T>({
    source,
    computation: (curr, prev) => (prev === undefined ? curr : prev.source),
  }).asReadonly();
}
