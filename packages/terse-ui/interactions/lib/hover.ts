import {booleanAttribute, computed, Directive, inject, input, output, signal} from '@angular/core';
import {watcher} from '@signality/core';
import {DataHover} from '@terse-ui/core/attributes';
import {
  OnMouseEnter,
  OnMouseLeave,
  OnPointerEnter,
  OnPointerLeave,
  OnTouchStart,
} from '@terse-ui/core/events';
import {GlobalPointerEvents} from './global-pointer-events';

/**
 * Tracks pointer hover on the host element.
 *
 * Sets `data-hover` when hovered and emits `hoverChange`. Correctly
 * ignores touch-emulated mouse events on hybrid devices — touch
 * interactions never trigger hover, matching native CSS `:hover` behavior.
 *
 * Disabling hover (via `hoverEnabled`) clears any active hover state and
 * suppresses future events.
 *
 * Uses both `pointerenter`/`pointerleave` and `mouseenter`/`mouseleave` as
 * a fallback for environments where pointer events fire emulated mouse
 * events after a touch interaction.
 */
@Directive({
  hostDirectives: [
    DataHover,
    OnPointerEnter,
    OnPointerLeave,
    OnMouseEnter,
    OnMouseLeave,
    OnTouchStart,
  ],
})
export class Hover {
  readonly #global = inject(GlobalPointerEvents);
  #localIgnoreMouseEvents = false;

  /**
   * Whether hover tracking is enabled.
   *
   * When `false`, hover state is forced to `false` and pointer/mouse
   * events are ignored. Useful for disabled elements that should not
   * show hover feedback.
   *
   * @default true
   */
  readonly hoverEnabled = input(true, {transform: booleanAttribute});

  /**
   * Emits when the hover state changes.
   *
   * Emits `true` on hover start and `false` on hover end.
   * Does not emit when hover is disabled.
   */
  readonly hoverChange = output<boolean>();

  readonly #hovered = signal(false);
  readonly hovered = computed(() => (this.hoverEnabled() ? this.#hovered() : false));

  constructor() {
    watcher(this.hovered, (hovered) => {
      this.hoverChange.emit(hovered);
    });

    // Wire DataHover to reflect hover state
    inject(DataHover).value.pipe(({next}) => next(this.hovered()));

    // Touch on this element — suppress subsequent emulated mouse events
    inject(OnTouchStart).pipe(({next}) => {
      this.#localIgnoreMouseEvents = true;
      next();
    });

    // Pointer events — primary hover detection
    inject(OnPointerEnter).pipe(({event, next}) => {
      if (this.#global.globalIgnoreMouseEvents && event.pointerType === 'mouse') {
        next();
        return;
      }
      this.#onHoverStart(event, event.pointerType);
      next();
    });

    inject(OnPointerLeave).pipe(({event, next}) => {
      if (this.#containsTarget(event)) {
        this.#onHoverEnd(event.pointerType);
      }
      next();
    });

    // Mouse events — fallback for touch-emulated mouse suppression
    inject(OnMouseEnter).pipe(({event, next}) => {
      if (!this.#localIgnoreMouseEvents && !this.#global.globalIgnoreMouseEvents) {
        this.#onHoverStart(event, 'mouse');
      }
      this.#localIgnoreMouseEvents = false;
      next();
    });

    inject(OnMouseLeave).pipe(({event, next}) => {
      if (this.#containsTarget(event)) {
        this.#onHoverEnd('mouse');
      }
      next();
    });
  }

  #onHoverStart(event: Event, pointerType: string): void {
    if (!this.hoverEnabled() || pointerType === 'touch' || this.#hovered()) {
      return;
    }

    if (!this.#containsTarget(event)) {
      return;
    }

    this.#hovered.set(true);
  }

  #onHoverEnd(pointerType: string): void {
    if (pointerType === 'touch' || !this.#hovered()) {
      return;
    }

    this.#hovered.set(false);
  }

  #containsTarget(event: Event): boolean {
    return (event.currentTarget as Element | null)?.contains(event.target as Element) === true;
  }
}
