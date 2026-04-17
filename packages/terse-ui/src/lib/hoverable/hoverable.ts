import {computed, Directive, DOCUMENT, inject, output, signal} from '@angular/core';
import {listener, setupSync, watcher} from '@signality/core';
import {
  OnMouseEnter,
  OnMouseLeave,
  OnPointerEnter,
  OnPointerLeave,
  OnTouchStart,
} from '@terse-ui/core/events';
import {isNode} from '@terse-ui/core/utils';
import {Focusable} from '../focusable/focusable';
import {GlobalPointerEvents} from './global-pointer-events';

/**
 * Tracks pointer hover on the host element. Ported from react-aria's `useHover`.
 *
 * Reflects `data-hover` on the host and emits `hoverChange`. Ignores
 * touch-emulated mouse events on hybrid devices so tapping never produces
 * hover state. Clears hover when the host becomes disabled or is removed
 * from the DOM while still under the pointer.
 */
@Directive({
  hostDirectives: [
    Focusable,
    OnPointerEnter,
    OnPointerLeave,
    OnTouchStart,
    OnMouseEnter,
    OnMouseLeave,
  ],
  host: {
    '[attr.data-hover]': "hovered() ? '' : null",
  },
})
export class Hoverable {
  readonly #doc = inject(DOCUMENT);
  readonly #focusable = inject(Focusable);
  readonly #global = inject(GlobalPointerEvents);

  readonly #hovered = signal(false);
  readonly hovered = computed(() => !this.#focusable.disabled() && this.#hovered());
  readonly hoverChange = output<boolean>();

  readonly #target = signal<Element | null>(null);
  readonly #pointerType = signal<string>('');
  #ignoreEmulatedMouseEvents = false;

  constructor() {
    watcher(this.hovered, (hovered) => this.hoverChange.emit(hovered));

    watcher(this.#focusable.disabled, (disabled) => {
      if (disabled) this.#triggerHoverEnd(this.#pointerType());
    });

    if (typeof PointerEvent !== 'undefined') {
      inject(OnPointerEnter).intercept(({event, next}) => {
        if (!this.#global.globalIgnoreEmulatedMouseEvents || event.pointerType !== 'mouse') {
          this.#triggerHoverStart(event, event.pointerType);
        }
        next();
      });

      inject(OnPointerLeave).intercept(({event, next}) => {
        if (!this.#focusable.disabled() && this.#nodeContains(event.currentTarget, event.target)) {
          this.#triggerHoverEnd(event.pointerType);
        }
        next();
      });
    } else {
      inject(OnTouchStart).intercept(({next}) => {
        this.#ignoreEmulatedMouseEvents = true;
        next();
      });

      inject(OnMouseEnter).intercept(({event, next}) => {
        if (!this.#ignoreEmulatedMouseEvents && !this.#global.globalIgnoreEmulatedMouseEvents) {
          this.#triggerHoverStart(event, 'mouse');
        }
        this.#ignoreEmulatedMouseEvents = false;
        next();
      });

      inject(OnMouseLeave).intercept(({event, next}) => {
        if (!this.#focusable.disabled() && this.#nodeContains(event.currentTarget, event.target)) {
          this.#triggerHoverEnd('mouse');
        }
        next();
      });
    }

    // When a hovered element shrinks or is removed the browser may not fire
    // pointerleave; a pointerover on the new target is the only signal.
    setupSync(() => {
      listener.capture(this.#doc, 'pointerover', (e) => {
        const target = this.#target();
        if (this.#hovered() && target && !this.#nodeContains(target, e.target)) {
          this.#triggerHoverEnd(e.pointerType);
        }
      });
    });
  }

  #triggerHoverStart(event: Event, pointerType: string): void {
    if (
      this.#focusable.disabled() ||
      pointerType === 'touch' ||
      this.#hovered() ||
      !this.#nodeContains(event.currentTarget, event.target)
    ) {
      return;
    }

    this.#pointerType.set(pointerType);
    this.#target.set(event.currentTarget as Element);
    this.#hovered.set(true);
  }

  #triggerHoverEnd(pointerType: string): void {
    if (pointerType === 'touch' || !this.#hovered()) {
      return;
    }

    this.#pointerType.set('');
    this.#target.set(null);
    this.#hovered.set(false);
  }

  #nodeContains(node: unknown, otherNode: unknown): boolean {
    return isNode(node) && isNode(otherNode) && node.contains(otherNode);
  }
}
