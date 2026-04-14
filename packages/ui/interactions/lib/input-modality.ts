import {DOCUMENT, inject, Injectable, signal} from '@angular/core';
import {listener} from '@signality/core';
import {setupSync} from '@signality/core/browser/listener';
import {notNil, Timeout} from '@terseware/ui/internal';

/** Modality attributed to a focus event. `null` = no focus. */
export type InputModalityValue = 'touch' | 'mouse' | 'keyboard' | 'program' | null;

/** Ignore emulated mouse events for this long after a touchstart. */
const TOUCH_BUFFER_MS = 650;

/** Key values that represent a modifier alone — ignored as "keyboard" intent. */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'ContextMenu']);

/**
 * Document-level input modality tracker. Listens to `keydown` / `mousedown`
 * / `touchstart` in the capture phase and remembers the most recent one.
 */
@Injectable({providedIn: 'root'})
export class InputModality {
  readonly #modality = signal<InputModalityValue>('program');
  readonly modality = this.#modality.asReadonly();
  #override: InputModalityValue | null = null;
  #touchGuard = false;
  readonly #touchTimeout = new Timeout();

  constructor() {
    const doc = inject(DOCUMENT);

    // Global document listeners must register synchronously or an early
    // event (e.g. page-load autofocus) can slip past before Angular finishes
    // its render-cycle tasks and attach the handlers.
    setupSync(() => {
      listener.capture.passive(doc, 'keydown', (event: KeyboardEvent) => {
        // A bare modifier keydown (e.g. holding Shift) isn't keyboard-navigation intent.
        if (MODIFIER_KEYS.has(event.key)) return;
        this.#modality.set('keyboard');
      });

      listener.capture.passive(doc, 'mousedown', () => {
        // Touch fires emulated mouse events ~300-650ms later on some devices.
        if (this.#touchGuard) return;
        this.#modality.set('mouse');
      });

      listener.capture.passive(doc, 'touchstart', () => {
        this.#modality.set('touch');
        this.#touchGuard = true;
        this.#touchTimeout.set(TOUCH_BUFFER_MS, () => {
          this.#touchGuard = false;
        });
      });
    });
  }

  /** Read the current modality, consuming a pending programmatic override. */
  consume(): InputModalityValue {
    if (notNil(this.#override)) {
      const v = this.#override;
      this.#override = null;
      return v;
    }
    return this.modality();
  }

  /** Mark the next focus event as programmatic. */
  markProgrammatic(): void {
    this.#override = 'program';
  }
}
