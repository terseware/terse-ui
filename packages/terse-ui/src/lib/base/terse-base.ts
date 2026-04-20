import {Directive, inject} from '@angular/core';
import {Base} from './base';

export interface TerseBase extends Base {}

/**
 * Applies hoverable behavior to any element.
 */
@Directive({
  selector: '[terseBase]',
  exportAs: 'terseBase',
  hostDirectives: [
    {
      directive: Base,
      inputs: ['role', 'type', 'disabled'],
      outputs: ['disabledChange'],
    },
  ],
})
export class TerseBase {
  constructor() {
    return inject(Base);
  }
}
