import {
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
import {hostAttr, injectElement, isNil, statePipeline} from '@terse-ui/utils';
import {Base} from '../base/base';
import {hostEvent} from '../events/host-events';

export type FocusOrigin = InputModality | 'program';

function transformTabIndex(v: number | `${number}` | null | undefined): number {
  return isNil(v) ? 0 : numberAttribute(v, 0);
}

@Directive({
  hostDirectives: [Base],
  host: {
    '[attr.tabindex]': 'tabIndex()',
    '[attr.data-focus]': 'focus()',
    '[attr.data-focus-visible]': 'focusVisible() ? "" : null',
    '[attr.data-focus-within]': 'focusWithin() ? "" : null',
  },
})
export class Focusable {
  readonly base = inject(Base);
  readonly #element = injectElement();
  readonly #inputModality = inputModality();
  readonly #modality = linkedSignal<FocusOrigin>(this.#inputModality);

  readonly tabIndexInput = input(transformTabIndex(hostAttr('tabindex') as `${number}` | null), {
    alias: 'tabIndex',
    transform: transformTabIndex,
  });

  readonly tabIndex = statePipeline(this.tabIndexInput, {
    finalize: (tabIndex) => {
      if (this.base.nativeDisable || !this.base.disabled()) return tabIndex;
      return this.base.softDisabled() ? tabIndex : Math.min(tabIndex, -1);
    },
  });

  readonly activeElement = activeElement();
  readonly isActiveElement = computed(() => this.activeElement() === this.#element);

  readonly #focus = elementFocus(this.#element, {focusVisible: false});
  readonly focus = computed(() =>
    !this.base.hardDisabled() && this.#focus() ? this.#modality() : null,
  );
  readonly focusChange = output<FocusOrigin>();

  readonly #focusVisible = elementFocus(this.#element, {focusVisible: true});
  readonly focusVisible = computed(() => !this.base.hardDisabled() && this.#focusVisible());
  readonly focusVisibleChange = output<boolean>();

  readonly #focusWithin = elementFocusWithin(this.#element);
  readonly focusWithin = computed(() => !this.#focus() && this.#focusWithin());
  readonly focusWithinChange = output<boolean>();

  constructor() {
    hostEvent(
      'keydown',
      ({event, next}) => {
        if (this.base.softDisabled() && event.key !== 'Tab') {
          event.preventDefault();
        }
        next();
      },
      {channel: 'FIFO'}, // Ensure this runs before the default handler
    );

    watcher(this.focus, (f) => this.focusChange.emit(f));
    watcher(this.focusVisible, (fv) => this.focusVisibleChange.emit(fv));
    watcher(this.focusWithin, (fw) => this.focusWithinChange.emit(fw));
  }

  focusElement(modality: FocusOrigin = 'program'): void {
    this.#modality.set(modality);
    if (modality === 'keyboard') {
      this.#focusVisible.set(true);
    } else {
      this.#focus.set(true);
    }
  }

  blurElement(): void {
    this.#focus.set(false);
  }
}
