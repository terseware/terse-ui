import {Directive, inject, signal} from '@angular/core';
import {Disabler} from '@terseware/ui/atoms';
import {injectElement} from '@terseware/ui/internal';
import {State} from '@terseware/ui/state';
import {InputModality, type InputModalityValue} from './input-modality';

/** Focused state snapshot — `focused` carries the origin modality. */
export interface FocusedState {
  focused: InputModalityValue;
  focusedVisible: boolean;
}

/**
 * Tracks focus + focus-visible on the host. `data-focus` carries the origin
 * modality (`keyboard`/`mouse`/`touch`/`program`) so consumers can style
 * focus rings per-source. `data-focus-visible` mirrors `:focus-visible`.
 */
@Directive({
  selector: '[focused]:not([unterse-focused]):not([unterse])',
  exportAs: 'focused',
  hostDirectives: [Disabler],
  host: {
    '[attr.data-focus]': 'snapshot(x => x.focused)',
    '[attr.data-focus-visible]': 'snapshot(x => x.focusedVisible) ? "" : null',
    '(focus)': 'onFocus($event)',
    '(blur)': 'onBlur()',
  },
})
export class Focused extends State<FocusedState> {
  readonly #element = injectElement();
  readonly #modality = inject(InputModality);
  readonly #disabled = inject(Disabler);

  constructor() {
    super(signal({focused: null, focusedVisible: false}), (e) => ({
      focused: this.#disabled.hard() ? null : e.focused,
      focusedVisible: this.#disabled.hard() ? false : e.focusedVisible,
    }));
  }

  readonly isFocused = this.select((s) => !!s.focused);
  readonly isFocusedVisible = this.select((s) => s.focusedVisible);

  focus() {
    this.#modality.markProgrammatic();
    this.#element.focus();
  }

  blur() {
    this.#element.blur();
  }

  protected onFocus(event: FocusEvent) {
    if (this.#disabled.hard()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    this.patch({
      focused: this.#modality.consume(),
      focusedVisible: target?.matches(':focus-visible') === true,
    });
  }

  protected onBlur() {
    if (this.#disabled.hard()) {
      return;
    }

    this.patch({focused: null, focusedVisible: false});
  }
}
