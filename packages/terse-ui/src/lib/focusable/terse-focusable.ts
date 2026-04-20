import {Directive, inject} from '@angular/core';
import {TerseBase} from '../base/terse-base';
import {Focusable} from './focusable';

export interface TerseFocusable extends Focusable {}

/**
 * Applies focusable behavior to any element.
 */
@Directive({
  selector: '[terseFocusable]',
  exportAs: 'terseFocusable',
  hostDirectives: [
    TerseBase,
    {
      directive: Focusable,
      inputs: ['tabIndex'],
      outputs: ['focusChange', 'focusVisibleChange', 'focusWithinChange'],
    },
  ],
})
export class TerseFocusable {
  constructor() {
    return inject(Focusable);
  }
}
