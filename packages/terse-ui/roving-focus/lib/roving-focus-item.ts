import {DestroyRef, Directive, effect, forwardRef, inject} from '@angular/core';
import {IdAttribute, TabIndex} from '@terse-ui/core/attributes';
import {Disabler} from '@terse-ui/core/disabler';
import {Focus} from '@terse-ui/core/interactions';
import {injectElement} from '@terse-ui/core/utils';
import {RovingFocus} from './roving-focus';

@Directive({
  hostDirectives: [IdAttribute, TabIndex, Focus, Disabler],
})
export class RovingFocusItem {
  readonly element = injectElement();
  readonly id = inject(IdAttribute).value;

  readonly #focus = inject(Focus);
  readonly #tabIndex = inject(TabIndex);
  readonly #parent = inject(forwardRef(() => RovingFocus));
  readonly #disabled = inject(Disabler);
  readonly hardDisabled = this.#disabled.hard;
  readonly softDisabled = this.#disabled.soft;

  constructor() {
    inject(DestroyRef).onDestroy(this.#parent.registerItem(this));
    this.#tabIndex.value.pipe(({next}) => next(this.#parent.tabStop() === this ? 0 : -1));
    effect(() => {
      if (this.#focus.focused()) {
        this.#parent.claimTabStop(this);
      }
    });
  }

  focusItem(): void {
    this.#focus.focus();
  }

  blurItem(): void {
    this.#focus.blur();
  }
}
