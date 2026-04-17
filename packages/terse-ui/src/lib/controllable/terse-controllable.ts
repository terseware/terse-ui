import {Directive, inject} from '@angular/core';
import {Controllable} from './controllable';

export interface TerseControllable extends Controllable {}

/**
 * Applies hoverable behavior to any element.
 */
@Directive({
  selector: '[terseControllable]',
  exportAs: 'terseControllable',
  hostDirectives: [
    {
      directive: Controllable,
      inputs: ['ariaControls'],
    },
  ],
})
export class TerseControllable {
  constructor() {
    return inject(Controllable);
  }
}
