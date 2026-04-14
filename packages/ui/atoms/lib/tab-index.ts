import {Directive, input, linkedSignal, numberAttribute} from '@angular/core';
import {hostAttr} from '@terseware/ui/internal';
import {State} from '@terseware/ui/state';

@Directive({
  exportAs: 'tabIndex',
  host: {
    '[tabIndex]': 'value()',
  },
})
export class TabIndex extends State<number> {
  readonly #init = numberAttribute(hostAttr('tabindex'), 0);
  readonly tabIndex = input(this.#init, {transform: (v) => numberAttribute(v, this.#init)});
  constructor() {
    super(linkedSignal(() => this.tabIndex()));
  }
}
