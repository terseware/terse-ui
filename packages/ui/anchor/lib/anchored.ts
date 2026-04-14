import {
  afterEveryRender,
  computed,
  Directive,
  inject,
  linkedSignal,
  model,
  signal,
} from '@angular/core';
import {setupContext} from '@signality/core/internal';
import {configBuilder, injectElement, isString} from '@terseware/ui/internal';
import {Anchor, type AnchorName} from './anchor';

/** Placement of an anchored element relative to its anchor. */
export type AnchoredSide =
  | 'center'
  | 'top center'
  | 'top span-left'
  | 'top span-right'
  | 'top'
  | 'left center'
  | 'left span-top'
  | 'left span-bottom'
  | 'left'
  | 'bottom center'
  | 'bottom span-left'
  | 'bottom span-right'
  | 'bottom'
  | 'right center'
  | 'right span-top'
  | 'right span-bottom'
  | 'right'
  | 'top left'
  | 'top right'
  | 'bottom left'
  | 'bottom right';

/** The alignment edge extracted from an {@link AnchoredSide}. */
export type AnchorAlign = 'top' | 'bottom' | 'left' | 'right';

/** CSS `position` value the anchored element uses. */
export type AnchoredPosition = 'fixed' | 'absolute';

const FLIP_ALIGN: Record<AnchorAlign, AnchorAlign> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/** Default configuration for {@link Anchored}. */
export interface AnchoredOpts {
  margin: string | number;
  position: AnchoredPosition;
  positionTryFallbacks: string[];
  side: AnchoredSide;
}

const [provideAnchoredOpts, injectAnchoredOpts] = configBuilder<AnchoredOpts>('Anchor', {
  margin: 0,
  position: 'fixed',
  positionTryFallbacks: ['flip-block', 'flip-inline', 'flip-block flip-inline'],
  side: 'bottom',
});

export {provideAnchoredOpts};

/**
 * Positions the host element against a CSS anchor using the native
 * `position-anchor` / `position-area` APIs, with fallback placements.
 */
@Directive({
  exportAs: 'anchored',
  host: {
    '[style.position-anchor]': 'positionAnchor()',
    '[style.position-area]': 'anchoredSide()',
    '[style.position-try-fallbacks]': 'anchoredPositionTryFallbacks()',
    '[style.position]': 'anchoredPosition()',
    '[style]': 'style()',
    '[attr.data-side]': 'anchoredSide()',
    '[attr.data-align]': 'align()',
    '[attr.data-offset]': 'offset()',
  },
})
export class Anchored {
  readonly #element = injectElement();
  readonly #ctx = setupContext();
  readonly #options = injectAnchoredOpts();

  readonly anchored = model<Anchor | AnchorName>();

  readonly positionAnchor = computed(() => {
    const inp = this.anchored();
    if (isString(inp)) {
      return inp;
    }
    const anchored = inp?.();
    if (isString(anchored)) {
      return anchored;
    }
    return this.#ctx.runInContext(() => inject(Anchor)());
  });

  readonly anchoredMargin = model<string | number>(this.#options.margin);
  readonly anchoredPosition = model<AnchoredPosition>(this.#options.position);
  readonly anchoredPositionTryFallbacks = model<string[]>(this.#options.positionTryFallbacks);
  readonly anchoredSide = model<AnchoredSide>(this.#options.side);

  readonly #align = signal(this.#options.side);
  readonly align = computed(
    () => (this.#align().split(' ')[0] || this.#options.side) as AnchorAlign,
  );

  constructor() {
    afterEveryRender(() => {
      const style = getComputedStyle(this.#element) as {positionArea?: AnchorAlign};
      this.#align.update((a) => style.positionArea ?? a);
    });
  }

  readonly offset = linkedSignal(() => {
    const val = this.anchoredMargin() || 0;
    return isString(val) ? val : `${val}px`;
  });

  protected readonly style = computed(() => ({
    [`margin-${FLIP_ALIGN[this.align()]}`]: this.anchoredMargin(),
  }));
}
