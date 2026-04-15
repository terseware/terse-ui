import {Directive, inject} from '@angular/core';
import {Disabler} from '@terse-ui/core/disabler';
import {RovingFocusItem} from './roving-focus-item';

export interface TerseRovingFocusItem extends RovingFocusItem {}

@Directive({
  selector: '[terseRovingFocusItem]',
  exportAs: 'terseRovingFocusItem',
  hostDirectives: [
    RovingFocusItem,
    {directive: Disabler, inputs: ['disabled', 'disablerOptions:terseDisablerOptions']},
  ],
})
export class TerseRovingFocusItem {
  constructor() {
    return inject(RovingFocusItem);
  }
}
