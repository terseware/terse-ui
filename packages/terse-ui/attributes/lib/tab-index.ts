import {Directive, HostAttributeToken, inject, input, numberAttribute} from '@angular/core';
import {pipelineSignal} from '@terse-ui/core/state';
import {isNil} from '@terse-ui/core/utils';

function transform(v: string | number | null | undefined): number | null {
  return isNil(v) ? null : numberAttribute(v, 0);
}

@Directive({host: {'[attr.tabindex]': 'value()'}})
export class TabIndex {
  readonly #host = inject(new HostAttributeToken('tabindex'), {optional: true});
  readonly #init = this.#host ? numberAttribute(this.#host, 0) : null;
  readonly _input = input(this.#init, {alias: 'tabIndex', transform});
  readonly value = pipelineSignal(this._input, {normalize: transform});
}
