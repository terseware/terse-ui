import {Directive, inject} from '@angular/core';
import {TabIndex} from '@terse-ui/core/attributes';
import {Disabler} from './disabler';

export interface TerseDisabler extends Disabler {}

/**
 * Applies disabler behavior to any element.
 *
 * @example
 * ```html
 * <button terseDisabler>Native</button>
 * <span terseDisabler>Non-native with full keyboard support</span>
 * <button terseDisabler disabled="soft">Focusable but non-interactive</button>
 * ```
 */
@Directive({
  selector: '[terseDisabler]',
  exportAs: 'terseDisabler',
  hostDirectives: [
    {directive: Disabler, inputs: ['disabled', 'disablerOptions:terseDisablerOptions']},
    {directive: TabIndex, inputs: ['tabIndex']},
  ],
})
export class TerseDisabler {
  constructor() {
    return inject(Disabler);
  }
}
