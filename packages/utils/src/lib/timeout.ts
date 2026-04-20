import {type EffectRef, type Injector} from '@angular/core';
import {setupContext} from '@signality/core/internal';

/**
 * A `setTimeout` handle that auto-clears when its injection context is destroyed
 * and can be replayed with a new delay/callback without leaking the old one.
 *
 * Use {@link Timeout.spawn} for one-shot delayed work, or {@link Timeout.create}
 * when the same handle is reused over the component's lifetime.
 *
 * @example
 * ```ts
 * // Fire once after 200ms, auto-cleared if the component is destroyed first.
 * Timeout.spawn(200, () => this.dismiss());
 *
 * // Reusable debounce-style handle.
 * readonly #t = Timeout.create();
 * onKey() { this.#t.set(300, () => this.save()); }
 * ```
 */
export class Timeout implements EffectRef {
  #currentId = 0;

  protected constructor(injector?: Injector | undefined) {
    const {runInContext} = setupContext(injector, new.target.constructor.bind(this));
    runInContext(({onCleanup}) => onCleanup(() => this.destroy()));
  }

  /** Allocate an empty handle. Schedule work later via {@link set}. */
  static create(injector?: Injector | undefined): Timeout {
    return new Timeout(injector);
  }

  /** Allocate and start in one call. Equivalent to `create()` then `set(delay, fn)`. */
  static spawn(delay: number, fn: () => void, injector?: Injector | undefined): Timeout {
    const timeout = new Timeout(injector);
    timeout.set(delay, fn);
    return timeout;
  }

  /** Cancel any pending callback and schedule a new one. */
  set(delay: number, fn: () => void): void {
    this.clear();
    this.#currentId = setTimeout(() => {
      this.#currentId = 0;
      fn();
    }, delay) as unknown as number;
  }

  /** `true` while a callback is pending. */
  get isSet(): boolean {
    return this.#currentId !== 0;
  }

  /** Cancel the pending callback, if any. Safe to call when idle. */
  clear(): void {
    if (this.#currentId !== 0) {
      clearTimeout(this.#currentId);
      this.#currentId = 0;
    }
  }

  /** Permanent cancellation. Called automatically on injector destroy. */
  destroy(): void {
    this.clear();
  }
}
