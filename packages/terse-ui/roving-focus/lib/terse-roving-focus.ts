import {Directive, inject} from '@angular/core';
import {TerseOrientation} from '@terse-ui/core/src';
import {RovingFocus} from './roving-focus';

export interface TerseRovingFocusState extends RovingFocus {}

@Directive({
  selector: '[terseRovingFocus]',
  exportAs: 'terseRovingFocus',
  hostDirectives: [
    TerseOrientation,
    {
      directive: RovingFocus,
      inputs: ['wrap'],
    },
  ],
})
export class TerseRovingFocus {
  constructor() {
    return inject(RovingFocus);
  }
}
