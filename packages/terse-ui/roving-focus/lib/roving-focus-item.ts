import {DestroyRef, Directive, effect, forwardRef, inject} from '@angular/core';
import {Focusable, Identifier} from '@terse-ui/core';
import {injectElement} from '@terse-ui/core/utils';
import {RovingFocus} from './roving-focus';

@Directive({
  hostDirectives: [Identifier, Focusable],
})
export class RovingFocusItem {
  readonly element = injectElement();
  readonly id = inject(Identifier).value;

  readonly #parent = inject(forwardRef(() => RovingFocus));
  readonly #focusable = inject(Focusable);
  readonly hardDisabled = this.#focusable.hardDisabled;
  readonly softDisabled = this.#focusable.softDisabled;

  constructor() {
    inject(DestroyRef).onDestroy(this.#parent.registerItem(this));
    this.#focusable.tabIndex.intercept(({next}) => next(this.#parent.tabStop() === this ? 0 : -1));
    effect(() => {
      if (this.#focusable.isActiveElement()) {
        this.#parent.claimTabStop(this);
      }
    });
  }

  focusItem(): void {
    this.#focusable.focus();
  }

  blurItem(): void {
    this.#focusable.blur();
  }
}
