import {Directive, inject} from '@angular/core';
import {TerseFocusable, TerseHoverable} from '@terse-ui/core';
import {Button} from './button';

export interface TerseButton extends Button {}

/**
 * Applies button behavior to any element.
 */
@Directive({
  selector: '[terseButton]',
  exportAs: 'terseButton',
  hostDirectives: [TerseFocusable, TerseHoverable, Button],
})
export class TerseButton {
  constructor() {
    return inject(Button);
  }
}
