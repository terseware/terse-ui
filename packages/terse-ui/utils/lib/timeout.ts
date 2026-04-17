import {type EffectRef, type Injector} from '@angular/core';
import {setupContext} from '@signality/core/internal';

/** Replayable `setTimeout` that auto-clears on injector destroy. */
export class Timeout implements EffectRef {
  #currentId = 0;

  protected constructor(injector?: Injector) {
    const {runInContext} = setupContext(injector, new.target.constructor.bind(this));
    runInContext(({onCleanup}) => onCleanup(() => this.destroy()));
  }

  static create(injector?: Injector): Timeout {
    return new Timeout(injector);
  }

  static spawn(delay: number, fn: () => void, injector?: Injector): Timeout {
    const timeout = new Timeout(injector);
    timeout.set(delay, fn);
    return timeout;
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
