import {booleanAttribute, Directive, inject, input, linkedSignal, output} from '@angular/core';
import {watcher} from '@signality/core';
import {DataFocus, DataFocusVisible} from '@terse-ui/core/attributes';
import {OnBlur, OnFocus} from '@terse-ui/core/events';
import {State} from '@terse-ui/core/state';
import {injectElement} from '@terse-ui/core/utils';
import {InputModality, type InputModalityValue} from './input-modality';

/** Focus state snapshot — `focus` carries the origin modality. */
export interface FocusState {
  enabled: boolean;
  focused: InputModalityValue;
  focusedVisible: boolean;
}

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
  exportAs: 'focus',
  hostDirectives: [DataFocus, DataFocusVisible, OnFocus, OnBlur],
})
export class Focus extends State<FocusState> {
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

  constructor() {
    super(
      linkedSignal(() => ({
        enabled: this.focusEnabled(),
        focused: null as InputModalityValue,
        focusedVisible: false,
      })),
      {
        transform: (s) => ({
          ...s,
          focused: s.enabled ? s.focused : null,
          focusedVisible: s.enabled ? s.focusedVisible : false,
        }),
      },
    );

    watcher(this.state.enabled, (enabled) => {
      this.patchState({enabled});
    });

    watcher(this.state.focused, (focused) => {
      this.focusChange.emit(focused);
    });

    watcher(this.state.focusedVisible, (focusVisible) => {
      this.focusVisibleChange.emit(focusVisible);
    });

    // Wire data attributes to reflect focus state
    inject(DataFocus).append(({next}) => next(this.state.focused()));
    inject(DataFocusVisible).append(({next}) => next(this.state.focusedVisible()));

    inject(OnFocus).append(({event, next}) => {
      if (this.state.enabled()) {
        const target = event.target as HTMLElement | null;
        const modality = this.#modality.consume();
        const focusVisible = target?.matches(':focus-visible') === true;
        this.patchState({focused: modality, focusedVisible: focusVisible});
      }
      next();
    });

    inject(OnBlur).append(({next}) => {
      if (this.state.enabled()) {
        this.patchState({focused: null, focusedVisible: false});
      }
      next();
    });
  }

  /** Programmatically enable focus tracking. */
  enable(): void {
    this.patchState({enabled: true});
  }

  /** Programmatically disable focus tracking and clear active state. */
  disable(): void {
    this.patchState({enabled: false});
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
