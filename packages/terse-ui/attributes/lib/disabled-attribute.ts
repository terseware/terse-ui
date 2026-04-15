import {Directive} from '@angular/core';
import {pipelineSignal} from '@terse-ui/core/state';
import {hasDisabledAttribute, injectElement} from '@terse-ui/core/utils';

@Directive({host: {'[attr.disabled]': 'value() ? "" : null'}})
export class DisabledAttribute {
  readonly #native = hasDisabledAttribute(injectElement());
  readonly value = pipelineSignal(false, {normalize: (value) => this.#native && value});
}
