import {Directive} from '@angular/core';
import {isBoolean} from '@terse-ui/core/utils';
import {AttributePipeline} from './attribute';

@Directive({
  exportAs: 'ariaDisabled',
  host: {'[aria-disabled]': 'state.domValue()'},
})
export class AriaDisabled extends AttributePipeline<'true' | 'false' | boolean | null> {
  static readonly VALID_SET = new Set(['true', 'false'] as const);
  constructor() {
    super(null, (result) => (isBoolean(result) ? (result ? 'true' : 'false') : result));
  }
}
