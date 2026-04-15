import {Directive} from '@angular/core';
import {pipelineSignal} from '@terse-ui/core/state';

@Directive({host: {'[style]': 'value()'}})
export class Styles {
  readonly value = pipelineSignal<Record<string, string | number | boolean | null | undefined>>({});
}
