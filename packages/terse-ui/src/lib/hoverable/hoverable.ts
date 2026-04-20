import {computed, Directive, inject, output, signal} from '@angular/core';
import {watcher} from '@signality/core';
import {isElement} from '@terse-ui/utils';
import {hostEvent} from '../events/host-events';
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
  hostDirectives: [Focusable],
  host: {
    '[attr.data-hover]': 'hovered() ? "" : null',
  },
})
export class Hoverable {
  readonly focusable = inject(Focusable);
  readonly base = this.focusable.base;
  readonly #global = inject(GlobalPointerEvents);

  readonly #hovered = signal(false);
  readonly hovered = computed(() => !this.base.disabled() && this.#hovered());
  readonly hoverChange = output<boolean>();

  readonly #target = signal<Element | null>(null);
  readonly #pointerType = signal<string>('');
  #ignoreEmulatedMouseEvents = false;

  constructor() {
    watcher(this.hovered, (hovered) => this.hoverChange.emit(hovered));

    watcher(this.base.disabled, (disabled) => {
      if (disabled) this.#triggerHoverEnd(this.#pointerType());
    });

    if (typeof PointerEvent !== 'undefined') {
      hostEvent('pointerenter', ({event, next}) => {
        if (!this.#global.globalIgnoreEmulatedMouseEvents || event.pointerType !== 'mouse') {
          this.#triggerHoverStart(event, event.pointerType);
        }
        next();
      });

      hostEvent('pointerleave', ({event, next}) => {
        if (!this.base.disabled() && this.#nodeContains(event.currentTarget, event.target)) {
          this.#triggerHoverEnd(event.pointerType);
        }
        next();
      });
    } else {
      hostEvent('touchstart', ({next}) => {
        this.#ignoreEmulatedMouseEvents = true;
        next();
      });

      hostEvent('mouseenter', ({event, next}) => {
        if (!this.#ignoreEmulatedMouseEvents && !this.#global.globalIgnoreEmulatedMouseEvents) {
          this.#triggerHoverStart(event, 'mouse');
        }
        this.#ignoreEmulatedMouseEvents = false;
        next();
      });

      hostEvent('mouseleave', ({event, next}) => {
        if (!this.base.disabled() && this.#nodeContains(event.currentTarget, event.target)) {
          this.#triggerHoverEnd('mouse');
        }
        next();
      });
    }

    // When a hovered element shrinks or is removed the browser may not fire
    // pointerleave; a pointerover on the new target is the only signal.
    hostEvent('pointerover', ({event, next}) => {
      const target = this.#target();
      if (this.#hovered() && target && !this.#nodeContains(target, event.target)) {
        this.#triggerHoverEnd(event.pointerType);
      }
      next();
    });
  }

  #triggerHoverStart(event: Event, pointerType: string): void {
    if (
      this.base.disabled() ||
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
    return isElement(node) && isElement(otherNode) && node.contains(otherNode);
  }
}
