import {Directive, inject} from '@angular/core';
import {Anchored} from './anchored';

export interface TerseAnchored extends Anchored {}

/**
 * Attribute directive that positions the host element against a CSS anchor.
 *
 * Accepts either a {@link TerseAnchor} template reference or a raw
 * `--anchor-*` ident via the `terseAnchored` input.
 *
 * @example
 * ```html
 * <button terseAnchor #trigger="terseAnchor">Open</button>
 * <div [terseAnchored]="trigger" terseAnchoredSide="bottom">Popover</div>
 * ```
 */
@Directive({
  selector: '[terseAnchored]',
  exportAs: 'terseAnchored',
  hostDirectives: [
    {
      directive: Anchored,
      inputs: [
        'anchored:terseAnchored',
        'anchoredMargin:terseAnchoredMargin',
        'anchoredPosition:terseAnchoredPosition',
        'anchoredPositionTryFallbacks:terseAnchoredPositionTryFallbacks',
        'anchoredSide:terseAnchoredSide',
      ],
      outputs: [
        'anchoredChange:terseAnchoredChange',
        'anchoredMarginChange:terseAnchoredMarginChange',
        'anchoredPositionChange:terseAnchoredPositionChange',
        'anchoredPositionTryFallbacksChange:terseAnchoredPositionTryFallbacksChange',
        'anchoredSideChange:terseAnchoredSideChange',
      ],
    },
  ],
})
export class TerseAnchored {
  constructor() {
    return inject(Anchored);
  }
}
