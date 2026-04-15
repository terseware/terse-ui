import {Directive} from '@angular/core';
import {pipelineSignal} from '@terse-ui/core/state';
import {isBoolean} from '@terse-ui/core/utils';

export abstract class DataAttribute {
  readonly value = pipelineSignal<string | number | boolean | null>(false, {
    normalize: (v) => (isBoolean(v) ? (v ? '' : null) : (v?.toString() ?? null)),
  });
}

@Directive({host: {'[attr.data-disabled]': 'value()'}})
export class DataDisabled extends DataAttribute {}

@Directive({host: {'[attr.data-focus]': 'value()'}})
export class DataFocus extends DataAttribute {}

@Directive({host: {'[attr.data-focus-visible]': 'value()'}})
export class DataFocusVisible extends DataAttribute {}

@Directive({host: {'[attr.data-hover]': 'value()'}})
export class DataHover extends DataAttribute {}
