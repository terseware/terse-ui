import {Directive} from '@angular/core';
import {StatePipeline} from '@terse-ui/core/state';
import {isBoolean} from '@terse-ui/core/utils';
import {type AttributeState} from './attribute';

export abstract class DataAttribute extends StatePipeline<
  string | number | boolean | null,
  AttributeState<string | number | boolean | null>
> {
  constructor() {
    super(null, {
      transform: (value) => ({
        value: value,
        domValue: isBoolean(value) ? (value ? '' : null) : (value?.toString() ?? null),
      }),
    });
  }
}

@Directive({
  exportAs: 'dataDisabled',
  host: {'[attr.data-disabled]': 'state.domValue()'},
})
export class DataDisabled extends DataAttribute {}

@Directive({
  exportAs: 'dataFocus',
  host: {'[attr.data-focus]': 'state.domValue()'},
})
export class DataFocus extends DataAttribute {}

@Directive({
  exportAs: 'dataFocusVisible',
  host: {'[attr.data-focus-visible]': 'state.domValue()'},
})
export class DataFocusVisible extends DataAttribute {}

@Directive({
  exportAs: 'dataHover',
  host: {'[attr.data-hover]': 'state.domValue()'},
})
export class DataHover extends DataAttribute {}
