import {Directive, inject} from '@angular/core';
import {TerseFocusable} from '../focusable/terse-focusable';
import {Pressable} from './pressable';

export interface TersePressable extends Pressable {}

/**
 * Applies hoverable behavior to any element.
 */
@Directive({
  selector: '[tersePressable]',
  exportAs: 'tersePressable',
  hostDirectives: [
    TerseFocusable,
    {
      directive: Pressable,
      inputs: ['isPressed', 'shouldCancelOnPointerExit'],
      outputs: ['pressChange', 'pressStart', 'pressEnd', 'press', 'pressUp'],
    },
  ],
})
export class TersePressable {
  constructor() {
    return inject(Pressable);
  }
}
