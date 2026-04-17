import {Directive, inject} from '@angular/core';
import {OpenClose} from './open-close';

export interface TerseOpenClose extends OpenClose {}

/**
 * Applies hoverable behavior to any element.
 */
@Directive({
  selector: '[terseOpenClose]',
  exportAs: 'terseOpenClose',
  hostDirectives: [
    {
      directive: OpenClose,
      inputs: ['opened'],
    },
  ],
})
export class TerseOpenClose {
  constructor() {
    return inject(OpenClose);
  }
}
