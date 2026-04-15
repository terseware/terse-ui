import {booleanAttribute, computed, Directive, inject, input, output, signal} from '@angular/core';
import {watcher} from '@signality/core';
import {DataFocus, DataFocusVisible} from '@terse-ui/core/attributes';
import {OnBlur, OnFocus} from '@terse-ui/core/events';
import {injectElement} from '@terse-ui/core/utils';
import {InputModality, type InputModalityValue} from './input-modality';

/**
 * Tracks focus and focus-visible on the host element.
 *
 * Sets `data-focus` to the origin modality (`keyboard`/`mouse`/`touch`/`program`)
 * so consumers can style focus rings per input source. Sets `data-focus-visible`
 * when the browser's `:focus-visible` heuristic matches — use this for keyboard-only
 * focus rings.
 *
 * Disabling focus tracking (via `focusEnabled` or programmatic `disable()`) clears
 * any active focus state and suppresses future events. The element itself remains
 * focusable — this only controls the tracked state and data attributes.
 */
@Directive({
  hostDirectives: [DataFocus, DataFocusVisible, OnFocus, OnBlur],
})
export class Focus {
  readonly #element = injectElement();
  readonly #modality = inject(InputModality);

  /**
   * Whether focus tracking is enabled.
   *
   * When `false`, focus state is forced to `null`/`false` and focus/blur
   * events are ignored. The element remains focusable in the DOM — this
   * only suppresses the tracked state and data attributes.
   *
   * @default true
   */
  readonly focusEnabled = input(true, {transform: booleanAttribute});

  /**
   * Emits the input modality on focus, `null` on blur.
   *
   * Values: `'keyboard'` | `'mouse'` | `'touch'` | `'program'` | `null`.
   */
  readonly focusChange = output<InputModalityValue>();

  /**
   * Emits `true` when `:focus-visible` matches, `false` on blur.
   *
   * Use to drive keyboard-only focus ring visibility from a parent component.
   */
  readonly focusVisibleChange = output<boolean>();

  readonly #focused = signal<InputModalityValue>(null);
  readonly focused = computed(() => (this.focusEnabled() ? this.#focused() : null));

  readonly #focusedVisible = signal(false);
  readonly focusedVisible = computed(() => (this.focusEnabled() ? this.#focusedVisible() : false));

  constructor() {
    watcher(this.focused, (focused) => {
      this.focusChange.emit(focused);
    });

    watcher(this.focusedVisible, (focusVisible) => {
      this.focusVisibleChange.emit(focusVisible);
    });

    // Wire data attributes to reflect focus state
    inject(DataFocus).value.pipe(({next}) => next(this.focused()));
    inject(DataFocusVisible).value.pipe(({next}) => next(this.focusedVisible()));

    inject(OnFocus).pipe(({event, next}) => {
      const target = event.target as HTMLElement | null;
      this.#focused.set(this.#modality.consume());
      this.#focusedVisible.set(target?.matches(':focus-visible') === true);
      next();
    });

    inject(OnBlur).pipe(({next}) => {
      this.#focused.set(null);
      this.#focusedVisible.set(false);
      next();
    });
  }

  /**
   * Programmatically focus the host element.
   *
   * Marks the focus as `'program'` modality so `data-focus="program"`
   * is set and `data-focus-visible` is not (matching browser behavior
   * where programmatic focus does not trigger `:focus-visible`).
   */
  focus(): void {
    this.#modality.markProgrammatic();
    this.#element.focus();
  }

  /** Programmatically blur the host element. */
  blur(): void {
    this.#element.blur();
  }
}
