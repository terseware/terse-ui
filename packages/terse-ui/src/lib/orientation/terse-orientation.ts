import {Directive, inject} from '@angular/core';
import {TerseBase} from '../base/terse-base';
import {Orientation} from './orientation';

export interface TerseOrientation extends Orientation {}

/**
 * Applies hoverable behavior to any element.
 */
@Directive({
  selector: '[terseOrientation]',
  exportAs: 'terseOrientation',
  hostDirectives: [TerseBase, {directive: Orientation, inputs: ['orientation']}],
})
export class TerseOrientation {
  constructor() {
    return inject(Orientation);
  }
}
