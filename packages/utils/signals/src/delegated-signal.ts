import type {CreateComputedOptions, WritableSignal} from '@angular/core';
import {computed, untracked} from '@angular/core';
import {SIGNAL} from '@angular/core/primitives/signals';

/**
 * Creates a {@link WritableSignal} that reads through {@link read} and writes through
 * {@link write}. Reads are reactive via {@link computed}; writes are the caller's
 * responsibility — typically they mutate an underlying source signal.
 */
export function delegatedSignal<T>(
  read: () => T,
  write: (value: NoInfer<T>) => void,
  opts?: CreateComputedOptions<NoInfer<T>>,
) {
  const source = computed(read, opts);
  return Object.assign(() => source(), {
    [SIGNAL]: source[SIGNAL],
    set: (value: T) => void write(value),
    update: (updateFn: (value: T) => T) => void write(updateFn(untracked(source))),
    asReadonly: () => source,
  }) as WritableSignal<T>;
}
