import {Directive, HostAttributeToken, inject, input, numberAttribute} from '@angular/core';
import {isNil, statePipeline} from '@terse-ui/core/utils';

@Directive({host: {'[tabIndex]': 'value()'}})
export class TabIndex {
  readonly #hostToken = inject(new HostAttributeToken('tabindex'), {optional: true});
  readonly #host = TabIndex.transform(numberAttribute(this.#hostToken, 0));
  readonly _input = input(this.#host, {alias: 'tabIndex', transform: TabIndex.transform});
  readonly value = statePipeline(this._input, {finalize: TabIndex.transform});

  static transform(v: unknown): number | null {
    return isNil(v) ? null : numberAttribute(v);
  }
}
