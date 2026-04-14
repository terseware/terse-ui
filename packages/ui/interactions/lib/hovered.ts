import {Directive, DOCUMENT, inject, Injectable, signal} from '@angular/core';
import {listener} from '@signality/core';
import {setupSync} from '@signality/core/browser/listener';
import {Disabler} from '@terseware/ui/atoms';
import {injectElement, Timeout} from '@terseware/ui/internal';
import {State} from '@terseware/ui/state';

/** Document-level pointer state that suppresses emulated mouse events after touch. */
@Injectable({providedIn: 'root'})
class GlobalPointerEvents {
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

/** Reactive hover state that ignores touch-emulated mouse events. */
@Directive({
  exportAs: 'hovered',
  hostDirectives: [Disabler],
  host: {
    '[attr.data-hover]': 'value() ? "" : null',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(mouseenter)': 'onMouseEnter($event)',
    '(mouseleave)': 'onMouseLeave($event)',
  },
})
export class Hovered extends State<boolean, boolean> {
  readonly #disabled = inject(Disabler).asReadonly();
  readonly #global = inject(GlobalPointerEvents);
  #localIgnoreMouseEvents = false;

  constructor() {
    super(signal(false), (e) => (this.#disabled() ? false : e));

    listener.passive(injectElement(), 'touchstart', () => {
      this.#localIgnoreMouseEvents = true;
    });
  }

  #onHoverBegin(event: Event, pointerType: string): void {
    if (this.#disabled() || pointerType === 'touch' || this.value()) {
      return;
    }

    if (!(event.currentTarget as Element | null)?.contains(event.target as Element)) {
      return;
    }

    this.set(true);
  }

  #onHoverFinished(pointerType: string): void {
    if (pointerType === 'touch' || !this.value()) {
      return;
    }

    this.set(false);
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (this.#global.globalIgnoreMouseEvents && event.pointerType === 'mouse') {
      return;
    }

    this.#onHoverBegin(event, event.pointerType);
  }

  protected onPointerLeave(event: PointerEvent): void {
    if ((event.currentTarget as Element | null)?.contains(event.target as Element)) {
      this.#onHoverFinished(event.pointerType);
    }
  }

  protected onMouseEnter(event: MouseEvent): void {
    if (!this.#localIgnoreMouseEvents && !this.#global.globalIgnoreMouseEvents) {
      this.#onHoverBegin(event, 'mouse');
    }

    this.#localIgnoreMouseEvents = false;
  }

  protected onMouseLeave(event: MouseEvent): void {
    if ((event.currentTarget as Element | null)?.contains(event.target as Element)) {
      this.#onHoverFinished('mouse');
    }
  }
}
