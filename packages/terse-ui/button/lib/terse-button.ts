import {Directive, inject} from '@angular/core';
import {RoleAttribute, TabIndex, TypeAttribute} from '@terse-ui/core/attributes';
import {Button} from './button';

export interface TerseButton extends Button {}

/**
 * Applies button behavior to any element.
 *
 * Works on `<button>`, `<a>`, `<span>`, `<div>`, `<input>`, or any element.
 * Automatically assigns `role="button"`, `type="button"`, `tabindex="0"`,
 * and keyboard activation for non-native elements. Native `<button>` elements
 * defer to the browser for all of these.
 *
 * @example
 * ```html
 * <button terseButton>Native</button>
 * <span terseButton>Non-native with full keyboard support</span>
 * <button terseButton disabled="soft">Focusable but non-interactive</button>
 * ```
 */
@Directive({
  selector: '[terseButton]',
  exportAs: 'terseButton',
  hostDirectives: [
    {directive: Button, inputs: ['disabled', 'options:terseButtonOptions']},
    {directive: TabIndex, inputs: ['tabIndex']},
    {directive: RoleAttribute, inputs: ['role']},
    {directive: TypeAttribute, inputs: ['type']},
  ],
})
export class TerseButton {
  constructor() {
    return inject(Button);
  }
}
