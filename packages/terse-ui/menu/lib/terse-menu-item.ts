import {Directive, inject} from '@angular/core';
import {Disabler} from '@terse-ui/core/disabler';
import {MenuItem} from './menu-item';

export interface TerseMenuItem extends MenuItem {}

@Directive({
  selector: '[terseMenuItem]',
  exportAs: 'terseMenuItem',
  hostDirectives: [
    {
      directive: MenuItem,
      inputs: ['closeOnClick:terseMenuItemCloseOnClick'],
      outputs: ['closeOnClickChange:terseMenuItemCloseOnClickChange'],
    },
    {directive: Disabler, inputs: ['disabled', 'disablerOptions:terseMenuItemDisablerOptions']},
  ],
})
export class TerseMenuItem {
  constructor() {
    return inject(MenuItem);
  }
}
