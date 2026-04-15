import {Directive} from '@angular/core';
import {statePipeline} from '@terse-ui/core/utils';

@Directive({
  host: {
    '[attr.data-opened]': "state() ? '' : null",
    '[attr.data-closed]': "state() ? null : ''",
    '[aria-expanded]': "state() ? 'true' : 'false'",
  },
})
export class OpenClose {
  readonly state = statePipeline(false);
}
