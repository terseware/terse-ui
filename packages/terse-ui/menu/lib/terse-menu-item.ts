import {Directive, inject} from '@angular/core';
import {TerseButton} from '@terse-ui/core/button';
import {TerseRovingFocusItem} from '@terse-ui/core/roving-focus';
import {MenuItem} from './menu-item';

export interface TerseMenuItem extends MenuItem {}

@Directive({
  selector: '[terseMenuItem]',
  exportAs: 'terseMenuItem',
  hostDirectives: [
    TerseButton,
    TerseRovingFocusItem,
    {
      directive: MenuItem,
      inputs: ['closeOnClick:menuItemCloseOnClick'],
      outputs: ['closeOnClickChange:menuItemCloseOnClickChange'],
    },
  ],
})
export class TerseMenuItem {
  constructor() {
    return inject(MenuItem);
  }
}
