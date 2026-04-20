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
import {Base} from '@terse-ui/core';
import {injectElement} from '@terse-ui/utils';
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

/**
 * Positions the host element against a CSS anchor using the native
 * `position-anchor` / `position-area` APIs, with fallback placements.
 */
@Directive({
  hostDirectives: [Base],
  host: {
    '[attr.data-side]': 'anchoredSide()',
    '[attr.data-align]': 'align()',
    '[attr.data-offset]': 'offset()',
  },
})
export class Anchored {
  readonly base = inject(Base);
  readonly #element = injectElement();
  readonly #ctx = setupContext();

  readonly anchored = model<Anchor | AnchorName>();

  readonly positionAnchor = computed(() => {
    const anchored = this.anchored();
    if (typeof anchored === 'string' && (anchored as string) !== '') return anchored;
    if (anchored && typeof anchored !== 'string') return anchored.value;
    return this.#ctx.runInContext(() => {
      const parent = inject(Anchor, {optional: true, skipSelf: true});
      if (!parent && isDevMode()) {
        console.warn('Anchored: No parent anchor found'); // eslint-disable-line no-console
      }
      return parent?.value ?? null;
    });
  });

  readonly anchoredMargin = model<string | number>(0);
  readonly anchoredPosition = model<AnchoredPosition>('fixed');
  readonly anchoredPositionTryFallbacks = model<string[]>([
    'flip-block',
    'flip-inline',
    'flip-block flip-inline',
  ]);
  readonly anchoredSide = model<AnchoredSide>('bottom');

  readonly #align = signal('bottom');
  readonly align = computed(() => (this.#align().split(' ')[0] || 'bottom') as AnchorAlign);

  readonly offset = linkedSignal(() => {
    const val = this.anchoredMargin() || 0;
    return typeof val === 'string' ? val : `${val}px`;
  });

  constructor() {
    afterEveryRender(() => {
      const style = getComputedStyle(this.#element) as {positionArea?: AnchorAlign};
      this.#align.update((a) => style.positionArea ?? a);
    });

    this.base.patchStyles(() => ({
      'position-area': this.anchoredSide(),
      'position-anchor': this.positionAnchor(),
      'position-try-fallbacks': this.anchoredPositionTryFallbacks().join(', '),
      'position': this.anchoredPosition(),
      [`margin-${FLIP_ALIGN[this.align()]}`]: this.anchoredMargin(),
    }));
  }
}
