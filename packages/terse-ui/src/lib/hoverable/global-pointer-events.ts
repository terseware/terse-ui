import {isPlatformServer} from '@angular/common';
import {DOCUMENT, Injectable, PLATFORM_ID, inject} from '@angular/core';
import {listener, setupSync} from '@signality/core';
import {Timeout} from '@terse-ui/core/utils';

/** Document-level pointer state that suppresses emulated mouse events after touch. */
@Injectable({providedIn: 'root'})
export class GlobalPointerEvents {
  readonly #doc = inject(DOCUMENT);
  readonly #touchTimeout = new Timeout();
  #globalIgnoreEmulatedMouseEvents = false;

  get globalIgnoreEmulatedMouseEvents(): boolean {
    return this.#globalIgnoreEmulatedMouseEvents;
  }

  constructor() {
    if (isPlatformServer(inject(PLATFORM_ID))) return;

    // Document listeners — synchronous so an early event can't slip past.
    setupSync(() => {
      listener.capture.passive(this.#doc, 'pointerup', this.#onGlobalPointerUp.bind(this));
      listener.capture.passive(this.#doc, 'touchend', this.#ignoreEmulatedMouse.bind(this));
    });
  }

  #ignoreEmulatedMouse(): void {
    this.#globalIgnoreEmulatedMouseEvents = true;
    this.#touchTimeout.set(500, () => (this.#globalIgnoreEmulatedMouseEvents = false));
  }

  #onGlobalPointerUp(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.#ignoreEmulatedMouse();
    }
  }
}
