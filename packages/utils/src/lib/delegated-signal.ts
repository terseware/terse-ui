import type {CreateComputedOptions, WritableSignal} from '@angular/core';
import {computed, linkedSignal} from '@angular/core';
import {SIGNAL} from '@angular/core/primitives/signals';

/**
 * Creates a {@link WritableSignal} that reads through {@link read} and writes through
 * {@link write}. Reads are reactive via {@link computed}; writes are the caller's
 * responsibility — typically they mutate an underlying source signal.
 */
export function delegatedSignal<T>({
  read,
  write,
  ...opts
}: CreateComputedOptions<NoInfer<T>> & {
  read: () => T;
  write: (value: NoInfer<T>) => void;
}) {
  const link = linkedSignal(read, opts);
  const source = computed(link, opts);
  return Object.assign(() => source(), {
    [SIGNAL]: source[SIGNAL],
    set: (value: T) => {
      link.set(value);
      write(value);
    },
    update: (updateFn: (value: T) => T) => {
      const value = updateFn(source());
      link.set(value);
      write(value);
    },
    asReadonly: () => source,
  }) as WritableSignal<T>;
}
