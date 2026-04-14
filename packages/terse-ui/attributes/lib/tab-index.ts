import {
  Directive,
  HostAttributeToken,
  inject,
  input,
  linkedSignal,
  numberAttribute,
} from '@angular/core';
import {isNull} from '@terse-ui/core/utils';
import {AttributePipeline} from './attribute';

@Directive({
  exportAs: 'tabIndex',
  host: {'[attr.tabindex]': 'state.domValue()'},
})
export class TabIndex extends AttributePipeline<number | null> {
  readonly #host = inject(new HostAttributeToken('tabindex'), {optional: true});
  readonly #init = isNull(this.#host) ? null : numberAttribute(this.#host, 0);
  readonly tabIndex = input(this.#init, {transform: (v) => numberAttribute(v, 0)});
  constructor() {
    super(
      linkedSignal(() => numberAttribute(this.tabIndex(), 0)),
      (value) => (isNull(value) ? null : numberAttribute(value).toString()),
    );
  }
}
