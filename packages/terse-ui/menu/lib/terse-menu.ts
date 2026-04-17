import {Directive, inject} from '@angular/core';
import {TerseIdentity} from '@terse-ui/core';
import {Anchored} from '@terse-ui/core/anchor';
import {TerseRovingFocus} from '@terse-ui/core/roving-focus';
import {Menu} from './menu';

export interface TerseMenu extends Menu {}

@Directive({
  selector: '[terseMenu]',
  exportAs: 'terseMenu',
  hostDirectives: [
    Menu,
    TerseRovingFocus,
    TerseIdentity,
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
