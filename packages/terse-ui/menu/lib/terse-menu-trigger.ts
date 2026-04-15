import {Directive, inject} from '@angular/core';
import {MenuTrigger} from './menu-trigger';

export interface TerseMenuTrigger extends MenuTrigger {}

@Directive({
  selector: '[terseMenuTrigger]',
  exportAs: 'terseMenuTrigger',
  hostDirectives: [
    {
      directive: MenuTrigger,
      inputs: ['menuTriggerFor:terseMenuTriggerFor'],
    },
  ],
})
export class TerseMenuTrigger {
  constructor() {
    return inject(MenuTrigger);
  }
}
