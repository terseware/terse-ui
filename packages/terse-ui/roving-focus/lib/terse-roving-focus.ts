import {Directive, inject} from '@angular/core';
import {Orientation, RoleAttribute} from '@terse-ui/core/attributes';
import {RovingFocus} from './roving-focus';

export interface TerseRovingFocusState extends RovingFocus {}

@Directive({
  selector: '[terseRovingFocus]',
  exportAs: 'terseRovingFocus',
  hostDirectives: [
    {
      directive: RovingFocus,
      inputs: [
        'enabled:terseRovingFocus',
        'wrap:terseRovingFocusWrap',
        'homeEnd:terseRovingFocusHomeEnd',
      ],
    },
    {directive: Orientation, inputs: ['orientation']},
    {directive: RoleAttribute, inputs: ['role']},
  ],
})
export class TerseRovingFocus {
  constructor() {
    return inject(RovingFocus);
  }
}
