import {Directive, inject} from '@angular/core';
import {Focusable} from './focusable';

export interface TerseFocusable extends Focusable {}

/**
 * Applies focusable behavior to any element.
 *
 * @example
 * ```html
 * <button terseFocusable>Native</button>
 * <button terseFocusable disabled>Native Disabled</button>
 * <span terseFocusable>Non-native with full keyboard support</span>
 * <span terseFocusable disabled>Non-native disabled</span>
 * <span terseFocusable disabled="soft">Non-native focusable but disabled</span>
 * <button terseFocusable disabled="soft">Native focusable but disabled</button>
 * ```
 */
@Directive({
  selector: '[terseFocusable]',
  exportAs: 'terseFocusable',
  hostDirectives: [
    {
      directive: Focusable,
      inputs: ['disabled', 'tabIndex'],
      outputs: ['focusChange', 'focusVisibleChange'],
    },
  ],
})
export class TerseFocusable {
  constructor() {
    return inject(Focusable);
  }
}
