import {Directive, HostAttributeToken, inject, input} from '@angular/core';
import {pipelineSignal} from '@terse-ui/core/state';

@Directive({host: {'[attr.role]': 'value()'}})
export class RoleAttribute {
  readonly #host = inject(new HostAttributeToken('role'), {optional: true});
  readonly _input = input(this.#host, {alias: 'role'});
  readonly value = pipelineSignal(this._input);
}
