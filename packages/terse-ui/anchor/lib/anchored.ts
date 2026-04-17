import {
  afterEveryRender,
  computed,
  Directive,
  inject,
  isDevMode,
  linkedSignal,
  model,
  signal,
} from '@angular/core';
import {setupContext} from '@signality/core/internal';
import {Styles} from '@terse-ui/core';
import {configBuilder, injectElement, isString} from '@terse-ui/core/utils';
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
  hostDirectives: [Styles],
  host: {
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
    const anchored = this.anchored();
    if (isString(anchored) && (anchored as string) !== '') return anchored;
    if (anchored && !isString(anchored)) return anchored.value;
    return this.#ctx.runInContext(() => {
      const parent = inject(Anchor, {optional: true, skipSelf: true});
      if (!parent && isDevMode()) {
        console.warn('Anchored: No parent anchor found'); // eslint-disable-line no-console
      }
      return parent?.value ?? null;
    });
  });

  readonly anchoredMargin = model<string | number>(this.#options.margin);
  readonly anchoredPosition = model<AnchoredPosition>(this.#options.position);
  readonly anchoredPositionTryFallbacks = model<string[]>(this.#options.positionTryFallbacks);
  readonly anchoredSide = model<AnchoredSide>(this.#options.side);

  readonly #align = signal(this.#options.side);
  readonly align = computed(
    () => (this.#align().split(' ')[0] || this.#options.side) as AnchorAlign,
  );

  readonly offset = linkedSignal(() => {
    const val = this.anchoredMargin() || 0;
    return isString(val) ? val : `${val}px`;
  });

  constructor() {
    afterEveryRender(() => {
      const style = getComputedStyle(this.#element) as {positionArea?: AnchorAlign};
      this.#align.update((a) => style.positionArea ?? a);
    });

    inject(Styles).patch(() => ({
      'position-area': this.anchoredSide(),
      'position-anchor': this.positionAnchor(),
      'position-try-fallbacks': this.anchoredPositionTryFallbacks().join(', '),
      'position': this.anchoredPosition(),
      [`margin-${FLIP_ALIGN[this.align()]}`]: this.anchoredMargin(),
    }));
  }
}
