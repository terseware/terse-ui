import {Directive, inject} from '@angular/core';
import {TerseFocusable} from '../focusable/terse-focusable';
import {Hoverable} from './hoverable';

export interface TerseHoverable extends Hoverable {}

/**
 * Applies hoverable behavior to any element.
 */
@Directive({
  selector: '[terseHoverable]',
  exportAs: 'terseHoverable',
  hostDirectives: [
    TerseFocusable,
    {
      directive: Hoverable,
      outputs: ['hoverChange'],
    },
  ],
})
export class TerseHoverable {
  constructor() {
    return inject(Hoverable);
  }
}
