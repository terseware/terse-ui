import {signal, type Signal} from '@angular/core';

/**
 * A reactive change counter. Reading `version` registers a dependency;
 * calling `bump` invalidates all current readers.
 */
export interface Notifier {
  readonly version: Signal<number>;
  readonly bump: () => void;
}

export function notifier(): Notifier {
  const source = signal(0);
  return {
    version: source.asReadonly(),
    bump: () => source.update((v) => (v >>> 0) + 1),
  };
}
