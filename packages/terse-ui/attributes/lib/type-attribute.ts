import {Directive, HostAttributeToken, inject, input, linkedSignal} from '@angular/core';
import {AttributePipeline} from './attribute';

@Directive({
  exportAs: 'type',
  host: {'[attr.type]': 'state.domValue()'},
})
export class TypeAttribute extends AttributePipeline<string | null> {
  readonly #host = inject(new HostAttributeToken('type'), {optional: true});
  readonly type = input(this.#host);
  constructor() {
    super(
      linkedSignal(() => this.type()),
      (value) => value,
    );
  }
}
