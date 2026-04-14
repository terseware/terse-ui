import {DOCUMENT, Injectable, inject} from '@angular/core';
import {listener, setupSync} from '@signality/core';
import {Timeout} from '@terse-ui/core/utils';

/** Document-level pointer state that suppresses emulated mouse events after touch. */
@Injectable({providedIn: 'root'})
export class GlobalPointerEvents {
  #globalIgnoreMouseEvents = false;
  readonly #touchTimeout = new Timeout();

  get globalIgnoreMouseEvents(): boolean {
    return this.#globalIgnoreMouseEvents;
  }

  constructor() {
    const doc = inject(DOCUMENT);
    // Document listeners — synchronous so an early event can't slip past.
    setupSync(() => {
      listener.capture.passive(doc, 'pointerup', this.#onGlobalPointerUp.bind(this));
      listener.capture.passive(doc, 'touchend', this.#ignoreEmulatedMouse.bind(this));
    });
  }

  #ignoreEmulatedMouse(): void {
    this.#globalIgnoreMouseEvents = true;
    this.#touchTimeout.set(50, () => (this.#globalIgnoreMouseEvents = false));
  }

  #onGlobalPointerUp(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.#ignoreEmulatedMouse();
    }
  }
}
