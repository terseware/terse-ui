import {Directive} from '@angular/core';
import {pipelineSignal} from '@terse-ui/core/state';
import {isBoolean} from '@terse-ui/core/utils';

@Directive({
  exportAs: 'ariaDisabled',
  host: {'[aria-disabled]': 'value()'},
})
export class AriaDisabled {
  readonly value = pipelineSignal<'true' | 'false' | boolean | null>(null, {
    normalize: (v) => (isBoolean(v) ? (v ? 'true' : 'false') : v),
  });
}
