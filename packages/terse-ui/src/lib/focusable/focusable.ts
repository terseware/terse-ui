import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  output,
} from '@angular/core';
import {
  activeElement,
  elementFocus,
  elementFocusWithin,
  inputModality,
  type InputModality,
} from '@signality/core';
import {watcher} from '@signality/core/reactivity';
import {OnKeyDown} from '@terse-ui/core/events';
import {
  hasDisabledAttribute,
  hostAttr,
  injectElement,
  isBoolean,
  isNil,
  statePipeline,
} from '@terse-ui/core/utils';

export type FocusOrigin = InputModality | 'program';

function transformTabIndex(v: number | `${number}` | null | undefined): number | null {
  return isNil(v) ? null : numberAttribute(v);
}

function transformDisabled(v: boolean | '' | 'hard' | 'soft' | null | undefined): boolean | 'soft' {
  if (isBoolean(v)) return v;
  if (v === 'soft') return 'soft';
  if (v === '' || v === 'hard') return true;
  return false;
}

function toDisabledVariant(v: boolean | 'soft' | null): 'hard' | 'soft' | null {
  if (v === true) return 'hard';
  if (v === 'soft') return 'soft';
  return null;
}

@Directive({
  hostDirectives: [OnKeyDown],
  host: {
    '[attr.disabled]': "disabledAttr() ? '' : null",
    '[aria-disabled]': 'ariaDisabledAttr()',
    '[attr.data-disabled]': 'disabledVariant()',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.data-focus]': 'focusOrigin()',
    '[attr.data-focus-visible]': "focusVisible() ? '' : null",
  },
})
export class Focusable {
  readonly #el = injectElement();

  /* Composite */

  readonly _inputComposite = input(false, {alias: 'composite', transform: booleanAttribute});
  readonly composite = statePipeline(this._inputComposite);

  /* Disabled */

  readonly _inputDisabled = input(false, {alias: 'disabled', transform: transformDisabled});
  readonly disabled = statePipeline(this._inputDisabled);
  readonly disabledVariant = computed(() => toDisabledVariant(this.disabled()));
  readonly softDisabled = computed(() => this.disabledVariant() === 'soft');
  readonly hardDisabled = computed(() => this.disabledVariant() === 'hard');

  readonly #nativeDisable = hasDisabledAttribute(this.#el);
  protected readonly disabledAttr = statePipeline(false, {
    finalize: (v) => (this.#nativeDisable && this.hardDisabled() ? true : v),
  });

  protected readonly ariaDisabledAttr = statePipeline<boolean | null>(null, {
    finalize: (v) =>
      (this.#nativeDisable && this.softDisabled()) || (!this.#nativeDisable && this.disabled())
        ? Boolean(this.disabled())
        : v,
  });

  /* Tab Index */

  readonly _inputTabIndex = input(transformTabIndex(hostAttr('tabindex') as `${number}`), {
    alias: 'tabIndex',
    transform: transformTabIndex,
  });
  readonly tabIndex = statePipeline(this._inputTabIndex, {
    finalize: (tabIndex) => {
      if (this.#nativeDisable) return tabIndex;
      if (this.hardDisabled()) return -1;
      return tabIndex ?? 0;
    },
  });

  /* Active Element */

  readonly #activeElement = activeElement();
  readonly isActiveElement = computed(() => this.#activeElement() === this.#el);

  /* Focus & Modality */

  readonly #inputModality = inputModality();
  readonly #modality = linkedSignal<FocusOrigin>(this.#inputModality);
  readonly #focus = elementFocus(this.#el, {focusVisible: false});
  readonly focused = computed(() => !this.hardDisabled() && this.#focus());
  readonly focusOrigin = computed(() => (this.#focus() ? this.#modality() : null));
  readonly focusChange = output<FocusOrigin>();

  /* Focus Visible */

  readonly #focusVisible = elementFocusWithin(this.#el);
  readonly focusVisible = computed(() => !this.hardDisabled() && this.#focusVisible());
  readonly focusVisibleChange = output<boolean>();

  constructor() {
    inject(OnKeyDown).intercept(({event, next, preventDefault}) => {
      if (this.softDisabled() && event.key !== 'Tab') {
        preventDefault();
      }
      next();
    });

    watcher(this.focusOrigin, (f) => this.focusChange.emit(f));
    watcher(this.focusVisible, (fv) => this.focusVisibleChange.emit(fv));
  }

  focus(): void {
    this.#modality.set('program');
    this.#focus.set(true);
  }

  blur(): void {
    this.#focus.set(false);
  }
}
