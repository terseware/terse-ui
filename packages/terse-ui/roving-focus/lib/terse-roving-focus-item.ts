import {Directive, inject} from '@angular/core';
import {TerseFocusable} from '@terse-ui/core';
import {RovingFocusItem} from './roving-focus-item';

export interface TerseRovingFocusItem extends RovingFocusItem {}

@Directive({
  selector: '[terseRovingFocusItem]',
  exportAs: 'terseRovingFocusItem',
  hostDirectives: [TerseFocusable, RovingFocusItem],
})
export class TerseRovingFocusItem {
  constructor() {
    return inject(RovingFocusItem);
  }
}
