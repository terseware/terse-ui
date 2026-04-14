import {Directive, inject} from '@angular/core';
import {Hover} from './hover';

export interface TerseHover extends Hover {}

/**
 * Attribute directive that applies hover tracking to any element.
 *
 * Sets `data-hover` when the element is hovered by a pointer (not touch).
 * Exposes the {@link Hover} state pipeline for composing directives.
 *
 * @example
 * ```html
 * <div terseHover (terseHoverChange)="onHover($event)">Hover me</div>
 * <button terseHover [terseHoverEnabled]="!isDisabled">Conditional</button>
 * ```
 */
@Directive({
  selector: '[terseHover]',
  exportAs: 'terseHover',
  hostDirectives: [
    {
      directive: Hover,
      inputs: ['hoverEnabled:terseHover'],
      outputs: ['hoverChange:terseHoverChange'],
    },
  ],
})
export class TerseHover {
  constructor() {
    return inject(Hover);
  }
}
