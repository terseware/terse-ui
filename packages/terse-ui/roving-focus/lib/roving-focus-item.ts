import {DestroyRef, Directive, forwardRef, inject, linkedSignal} from '@angular/core';
import {IdAttribute, TabIndex} from '@terse-ui/core/attributes';
import {Focus} from '@terse-ui/core/interactions';
import {State} from '@terse-ui/core/state';
import {RovingFocus} from './roving-focus';

interface RovingFocusItemInnerState {
  disabled: boolean | 'soft';
}

export interface RovingFocusItemState extends RovingFocusItemInnerState {
  active: boolean;
}

@Directive({
  exportAs: 'rovingFocusItem',
  hostDirectives: [IdAttribute, TabIndex, Focus],
})
export class RovingFocusItem extends State<RovingFocusItemInnerState, RovingFocusItemState> {
  readonly id = inject(IdAttribute).value;

  readonly #focused = inject(Focus);
  readonly #tabIndex = inject(TabIndex);
  readonly #parent = inject(
    forwardRef(() => RovingFocus),
    {skipSelf: true},
  ) as RovingFocus;

  constructor() {
    super(
      linkedSignal(() => ({
        disabled: false,
      })),
      {
        transform: (value: RovingFocusItemInnerState) => ({
          ...value,
          active: !!this.#focused.state.focused(),
        }),
      },
    );

    this.#tabIndex.append(({next}) => next(this.state.active() ? 0 : -1));
    inject(DestroyRef).onDestroy(this.#parent.addItem(this));
  }
}
