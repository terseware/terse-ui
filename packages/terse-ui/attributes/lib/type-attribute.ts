import {Directive, HostAttributeToken, inject, input} from '@angular/core';
import {statePipeline} from '@terse-ui/core/utils';

@Directive({host: {'[attr.type]': 'value()'}})
export class TypeAttribute {
  readonly #host = inject(new HostAttributeToken('type'), {optional: true});
  readonly _input = input(this.#host, {alias: 'type'});
  readonly value = statePipeline(this._input);
}
