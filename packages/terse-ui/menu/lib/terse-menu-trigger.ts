import {Directive, inject} from '@angular/core';
import {TerseButton} from '@terse-ui/core/button';
import {TerseControllable, TerseOpenClose} from '@terse-ui/core/src';
import {MenuTrigger} from './menu-trigger';

export interface TerseMenuTrigger extends MenuTrigger {}

@Directive({
  selector: '[terseMenuTrigger]',
  exportAs: 'terseMenuTrigger',
  hostDirectives: [
    TerseButton,
    TerseOpenClose,
    TerseControllable,
    {
      directive: MenuTrigger,
      inputs: ['menuTriggerFor:terseMenuTrigger'],
    },
  ],
})
export class TerseMenuTrigger {
  constructor() {
    return inject(MenuTrigger);
  }
}
