import {computed, Directive, inject, output, signal} from '@angular/core';
import {watcher} from '@signality/core';
import {
  OnMouseEnter,
  OnMouseLeave,
  OnPointerEnter,
  OnPointerLeave,
  OnTouchStart,
} from '@terse-ui/core/events';
import {Focusable} from '../focusable/focusable';

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
    '[attr.data-pressed]': "pressed() ? '' : null",
  },
})
export class Pressable {
  readonly #focusable = inject(Focusable);

  readonly #pressed = signal(false);
  readonly pressed = computed(() => !this.#focusable.disabled() && this.#pressed());
  readonly pressChange = output<boolean>();

  constructor() {
    watcher(this.pressed, (pressed) => this.pressChange.emit(pressed));
  }
}
