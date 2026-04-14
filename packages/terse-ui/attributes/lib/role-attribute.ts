import {Directive, HostAttributeToken, inject, input, linkedSignal} from '@angular/core';
import {AttributePipeline} from './attribute';

@Directive({
  exportAs: 'role',
  host: {'[attr.role]': 'state.domValue()'},
})
export class RoleAttribute extends AttributePipeline<string | null> {
  readonly #host = inject(new HostAttributeToken('role'), {optional: true});
  readonly role = input(this.#host);
  constructor() {
    super(
      linkedSignal(() => this.role()),
      (value) => value,
    );
  }
}
