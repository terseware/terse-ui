import {Directive, inject} from '@angular/core';
import {statePipeline} from '@terse-ui/core/utils';
import {AriaExpanded} from './aria';
import {DataClosed, DataOpened} from './data-attributes';

@Directive({
  hostDirectives: [DataOpened, DataClosed, AriaExpanded],
})
export class OpenClose {
  readonly value = statePipeline(false);
  constructor() {
    inject(DataOpened).value.pipe(() => this.value());
    inject(DataClosed).value.pipe(() => !this.value());
    inject(AriaExpanded).value.pipe(() => this.value());
  }
}
