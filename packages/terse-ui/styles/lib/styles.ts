import {Directive} from '@angular/core';
import {statePipeline} from '@terse-ui/core/utils';

@Directive({host: {'[style]': 'value()'}})
export class Styles {
  readonly value = statePipeline<Record<string, string | number | boolean | null | undefined>>({});
}
