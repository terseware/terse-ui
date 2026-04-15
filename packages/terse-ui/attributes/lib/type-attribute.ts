import {Directive, HostAttributeToken, inject, input} from '@angular/core';
import {pipelineSignal} from '@terse-ui/core/state';

@Directive({host: {'[attr.type]': 'value()'}})
export class TypeAttribute {
  readonly #host = inject(new HostAttributeToken('type'), {optional: true});
  readonly _input = input(this.#host, {alias: 'type'});
  readonly value = pipelineSignal(this._input);
}
