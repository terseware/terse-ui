import {Directive, inject} from '@angular/core';
import {Focus} from './focus';

export interface TerseFocus extends Focus {}

/**
 * Attribute directive that applies focus tracking to any element.
 *
 * Sets `data-focus` with the input modality and `data-focus-visible` when
 * the browser's `:focus-visible` heuristic matches. Exposes the
 * {@link Focus} state pipeline for composing directives.
 *
 * @example
 * ```html
 * <input terseFocus (terseFocusChange)="onFocus($event)" />
 * <button terseFocus (terseFocusVisibleChange)="onVisible($event)">Click</button>
 * ```
 */
@Directive({
  selector: '[terseFocus]',
  exportAs: 'terseFocus',
  hostDirectives: [
    {
      directive: Focus,
      inputs: ['focusEnabled:terseFocus'],
      outputs: ['focusChange:terseFocusChange', 'focusVisibleChange:terseFocusVisibleChange'],
    },
  ],
})
export class TerseFocus {
  constructor() {
    return inject(Focus);
  }
}
