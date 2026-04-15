import {Directive, inject} from '@angular/core';
import {Anchor} from './anchor';

export interface TerseAnchor extends Anchor {}

/**
 * Attribute directive that assigns a CSS `anchor-name` to the host element
 * so it can be referenced by a {@link TerseAnchored} element.
 *
 * @example
 * ```html
 * <button terseAnchor #trigger="terseAnchor">Open</button>
 * <div [terseAnchored]="trigger">Popover</div>
 * ```
 */
@Directive({
  selector: '[terseAnchor]',
  exportAs: 'terseAnchor',
  hostDirectives: [Anchor],
})
export class TerseAnchor {
  constructor() {
    return inject(Anchor);
  }
}
