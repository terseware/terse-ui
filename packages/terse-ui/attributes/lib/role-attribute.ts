import {Directive, HostAttributeToken, inject, input} from '@angular/core';
import {statePipeline} from '@terse-ui/core/utils';

@Directive({host: {'[attr.role]': 'value()'}})
export class RoleAttribute {
  readonly #role = inject(new HostAttributeToken('role'), {optional: true});
  readonly _inputRole = input(this.#role, {alias: 'role'});
  readonly value = statePipeline(this._inputRole);
}
