import {Directive, inject} from '@angular/core';
import {Anchored} from '@terse-ui/core/anchor';
import {Menu} from './menu';

export interface TerseMenu extends Menu {}

@Directive({
  selector: '[terseMenu]',
  exportAs: 'terseMenu',
  hostDirectives: [
    Menu,
    {
      directive: Anchored,
      inputs: ['anchoredSide:terseMenuSide', 'anchoredMargin:terseMenuMargin'],
    },
  ],
})
export class TerseMenu {
  constructor() {
    return inject(Menu);
  }
}
