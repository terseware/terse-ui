import {Directive, inject} from '@angular/core';
import {Orientation} from './orientation';

export interface TerseOrientation extends Orientation {}

/**
 * Applies hoverable behavior to any element.
 */
@Directive({
  selector: '[terseOrientation]',
  exportAs: 'terseOrientation',
  hostDirectives: [{directive: Orientation, inputs: ['orientation']}],
})
export class TerseOrientation {
  constructor() {
    return inject(Orientation);
  }
}
