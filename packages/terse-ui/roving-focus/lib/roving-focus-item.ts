import {DestroyRef, Directive, inject} from '@angular/core';
import {IdAttribute, TabIndex} from '@terse-ui/core/attributes';
import {Focus} from '@terse-ui/core/interactions';
import {RovingFocusStore} from './roving-focus-store';

@Directive({
  hostDirectives: [IdAttribute, TabIndex, Focus],
})
export class RovingFocusItem {
  readonly id = inject(IdAttribute).value;

  readonly #focused = inject(Focus);
  readonly #tabIndex = inject(TabIndex);
  readonly #store = inject(RovingFocusStore);

  constructor() {
    this.#tabIndex.value.pipe(({next}) => next(this.#focused.state.focused() ? 0 : -1));
    inject(DestroyRef).onDestroy(this.#store.registerItem(this));
  }
}
