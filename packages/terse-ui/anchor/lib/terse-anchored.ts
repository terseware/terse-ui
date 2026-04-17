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
        'anchoredMargin',
        'anchoredPosition',
        'anchoredPositionTryFallbacks',
        'anchoredSide',
      ],
      outputs: [
        'anchoredChange',
        'anchoredMarginChange',
        'anchoredPositionChange',
        'anchoredPositionTryFallbacksChange',
        'anchoredSideChange',
      ],
    },
  ],
})
export class TerseAnchored {
  constructor() {
    return inject(Anchored);
  }
}
