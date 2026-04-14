import {booleanAttribute, Directive, input} from '@angular/core';
import {Orientation} from '@terse-ui/core/attributes';
import {createDirectiveState, type DirectiveState} from '@terse-ui/core/state';
import {RovingFocusStore} from './roving-focus-store';

@Directive({
  exportAs: 'rovingFocus',
  hostDirectives: [Orientation],
  providers: [RovingFocusStore],
})
export class RovingFocus {
  readonly state: DirectiveState<RovingFocus>;
  readonly enabled = input(true, {transform: booleanAttribute});
  readonly wrap = input(true, {transform: booleanAttribute});
  readonly homeEnd = input(true, {transform: booleanAttribute});

  constructor() {
    this.state = createDirectiveState(this);
    this.state.enabled.set();
  }
}
