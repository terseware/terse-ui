import {Directive} from '@angular/core';
import {hasDisabledAttribute, injectElement, statePipeline} from '@terse-ui/core/utils';

@Directive({host: {'[attr.disabled]': 'value() ? "" : null'}})
export class DisabledAttribute {
  readonly #native = hasDisabledAttribute(injectElement());
  readonly value = statePipeline(false, {finalize: (value) => this.#native && value});
}
