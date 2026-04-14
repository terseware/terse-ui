import {Directive, inject} from '@angular/core';
import {RovingFocusItem} from './roving-focus-item';

export interface TerseRovingFocusItem extends RovingFocusItem {}

@Directive({
  selector: '[terseRovingFocusItem]',
  exportAs: 'terseRovingFocusItem',
  hostDirectives: [RovingFocusItem],
})
export class TerseRovingFocusItem {
  constructor() {
    return inject(RovingFocusItem);
  }
}
