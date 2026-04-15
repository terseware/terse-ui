import {booleanAttribute, Directive, inject, input, linkedSignal, output} from '@angular/core';
import {watcher} from '@signality/core';
import {DataHover} from '@terse-ui/core/attributes';
import {
  OnMouseEnter,
  OnMouseLeave,
  OnPointerEnter,
  OnPointerLeave,
  OnTouchStart,
} from '@terse-ui/core/events';
import {State} from '@terse-ui/core/state';
import {GlobalPointerEvents} from './global-pointer-events';

/** Hover state snapshot. */
export interface HoverState {
  enabled: boolean;
  hovered: boolean;
}

/**
 * Tracks pointer hover on the host element.
 *
 * Sets `data-hover` when hovered and emits `hoverChange`. Correctly
 * ignores touch-emulated mouse events on hybrid devices — touch
 * interactions never trigger hover, matching native CSS `:hover` behavior.
 *
 * Disabling hover (via `hoverEnabled` or programmatic `disable()`) clears
 * any active hover state and suppresses future events.
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
export class Hover extends State<HoverState> {
  readonly #global = inject(GlobalPointerEvents);
  #localIgnoreMouseEvents = false;

  /**
   * Whether hover tracking is enabled.
   *
   * When `false`, the hover state is forced to `false` and pointer/mouse
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

  constructor() {
    super(
      linkedSignal(() => ({enabled: this.hoverEnabled(), hovered: false})),
      {transform: (s) => ({...s, hovered: s.enabled ? s.hovered : false})},
    );

    watcher(this.state.hovered, (hovered) => {
      this.hoverChange.emit(hovered);
    });

    // Wire DataHover to reflect hover state
    inject(DataHover).value.pipe(({next}) => next(this.state.hovered()));

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

  /** Programmatically enable hover tracking. */
  enable(): void {
    this.patchState({enabled: true});
  }

  /** Programmatically disable hover tracking and clear active hover. */
  disable(): void {
    this.patchState({enabled: false});
  }

  #onHoverStart(event: Event, pointerType: string): void {
    if (!this.state.enabled() || pointerType === 'touch' || this.state.hovered()) {
      return;
    }

    if (!this.#containsTarget(event)) {
      return;
    }

    this.patchState({hovered: true});
  }

  #onHoverEnd(pointerType: string): void {
    if (pointerType === 'touch' || !this.state.hovered()) {
      return;
    }

    this.patchState({hovered: false});
  }

  #containsTarget(event: Event): boolean {
    return (event.currentTarget as Element | null)?.contains(event.target as Element) === true;
  }
}
