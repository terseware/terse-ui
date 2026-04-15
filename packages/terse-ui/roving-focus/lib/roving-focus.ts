import {booleanAttribute, Directive, inject, input} from '@angular/core';
import {Orientation} from '@terse-ui/core/attributes';
import {RovingFocusStore} from './roving-focus-store';

@Directive({
  hostDirectives: [Orientation],
  providers: [RovingFocusStore],
})
export class RovingFocus {
  readonly enabled = input(true, {transform: booleanAttribute});
  readonly wrap = input(true, {transform: booleanAttribute});
  readonly homeEnd = input(true, {transform: booleanAttribute});

  constructor() {
    inject(RovingFocusStore).linkInputs({
      enabled: this.enabled,
      wrap: this.wrap,
      homeEnd: this.homeEnd,
    });
  }
}
