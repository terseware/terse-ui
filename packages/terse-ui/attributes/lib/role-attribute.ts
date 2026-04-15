import {Directive, HostAttributeToken, inject, input} from '@angular/core';
import {statePipeline} from '@terse-ui/core/utils';

@Directive({host: {'[attr.role]': 'value()'}})
export class RoleAttribute {
  readonly #host = inject(new HostAttributeToken('role'), {optional: true});
  readonly _input = input(this.#host, {alias: 'role'});
  readonly value = statePipeline(this._input);
}
