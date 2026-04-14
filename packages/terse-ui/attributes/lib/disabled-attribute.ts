import {Directive} from '@angular/core';
import {hasDisabledAttribute, injectElement} from '@terse-ui/core/utils';
import {AttributePipeline} from './attribute';

@Directive({
  exportAs: 'disabled',
  host: {'[attr.disabled]': 'state.domValue()'},
})
export class DisabledAttribute extends AttributePipeline<boolean> {
  readonly #native = hasDisabledAttribute(injectElement());
  constructor() {
    super(false, (value) => (this.#native && value ? '' : null));
  }
}
