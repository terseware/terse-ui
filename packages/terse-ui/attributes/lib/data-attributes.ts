import {Directive} from '@angular/core';
import {isBoolean, statePipeline} from '@terse-ui/core/utils';

export abstract class DataAttribute {
  readonly value = statePipeline<string | number | boolean | null>(false, {
    finalize: (v) => (isBoolean(v) ? (v ? '' : null) : (v?.toString() ?? null)),
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

@Directive({host: {'[attr.data-highlighted]': 'value()'}})
export class DataHighlighted extends DataAttribute {}

@Directive({host: {'[attr.data-side]': 'value()'}})
export class DataSide extends DataAttribute {}

@Directive({host: {'[attr.data-align]': 'value()'}})
export class DataAlign extends DataAttribute {}

@Directive({host: {'[attr.data-offset]': 'value()'}})
export class DataOffset extends DataAttribute {}

@Directive({host: {'[attr.data-inset]': 'value()'}})
export class DataInset extends DataAttribute {}

@Directive({host: {'[attr.data-opened]': 'value()'}})
export class DataOpened extends DataAttribute {}

@Directive({host: {'[attr.data-closed]': 'value()'}})
export class DataClosed extends DataAttribute {}
