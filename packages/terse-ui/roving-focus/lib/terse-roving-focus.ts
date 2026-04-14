import {Directive, inject} from '@angular/core';
import {Orientation} from '@terse-ui/core/attributes';
import {RovingFocus} from './roving-focus';

export interface TerseRovingFocusState extends RovingFocus {}

@Directive({
  selector: '[terseRovingFocus]',
  exportAs: 'terseRovingFocus',
  hostDirectives: [
    {
      directive: RovingFocus,
      inputs: ['enabled:terseRovingFocus', 'wrap', 'homeEnd'],
    },
    {
      directive: Orientation,
      inputs: ['orientation'],
    },
  ],
})
export class TerseRovingFocus {
  constructor() {
    return inject(RovingFocus);
  }
}
