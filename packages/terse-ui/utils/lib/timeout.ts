import {DestroyRef, inject, type EffectRef, type Injector} from '@angular/core';

/** Replayable `setTimeout` that auto-clears on injector destroy. */
export class Timeout implements EffectRef {
  #currentId = 0;

  constructor(injector?: Injector) {
    const destroy = injector?.get(DestroyRef) ?? inject(DestroyRef);
    destroy.onDestroy(() => this.clear());
  }

  set(delay: number, fn: () => void): void {
    this.clear();
    this.#currentId = setTimeout(() => {
      this.#currentId = 0;
      fn();
    }, delay) as unknown as number;
  }

  get isSet(): boolean {
    return this.#currentId !== 0;
  }

  clear(): void {
    if (this.#currentId !== 0) {
      clearTimeout(this.#currentId);
      this.#currentId = 0;
    }
  }

  destroy(): void {
    this.clear();
  }
}
