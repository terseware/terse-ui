import {computed, Directive, effect, forwardRef, inject} from '@angular/core';
import {Disabler, Identifier, TabIndex} from '@terseware/ui/atoms';
import {Focused} from '@terseware/ui/interactions';
import {injectElement} from '@terseware/ui/internal';
import {pipe} from '@terseware/ui/state';
import {RovingFocus} from './roving-focus';

/**
 * Item participating in a parent {@link RovingFocus}. Gets `tabindex=0`
 * while it owns the group's single tab stop and `tabindex=-1` otherwise,
 * so the group exposes exactly one tab stop to the page's outer focus
 * order. The tab stop defaults to the first non-hard-disabled item at
 * mount and transfers to whichever item most recently received focus.
 *
 * Composes `Focused` for modality-aware programmatic focus and CSS
 * styling hooks, and `Identifier` so consumers can reference the item
 * by id (aria-activedescendant, aria-labelledby, etc.). Reads `Disabler`
 * to let the parent container skip hard-disabled items during traversal.
 */
@Directive({
  selector: '[rovingFocusItem]:not([unterse-rovingFocusItem]):not([unterse])',
  exportAs: 'rovingFocusItem',
  hostDirectives: [
    Identifier,
    Focused,
    {directive: Disabler, inputs: ['disabled', 'softDisabled']},
  ],
})
export class RovingFocusItem {
  readonly element = injectElement();
  readonly id = inject(Identifier);
  readonly disabled = inject(Disabler);
  readonly hardDisabled = this.disabled.hard;
  readonly softDisabled = this.disabled.soft;

  readonly #focused = inject(Focused);
  readonly #parent = inject(
    forwardRef(() => RovingFocus),
    {optional: true},
  );
  readonly isFocused = computed(() => !!this.#focused().focused);

  /**
   * True when this item should expose `tabindex=0`. Inside a `RovingFocus`
   * group, exactly one item is the tab stop at any time. Outside a group
   * (bare use), the item is its own tab stop while focused.
   */
  readonly isActive = computed(() => {
    if (this.#parent) return this.#parent.tabStop() === this;
    return this.isFocused();
  });

  constructor() {
    pipe(TabIndex, () => (this.isActive() ? 0 : -1));

    // When this item takes focus, tell the parent so the tab stop follows.
    // Using an effect keeps the signal graph the source of truth and avoids
    // routing through the DOM `(focus)` event, which would miss programmatic
    // focus transitions driven by the parent's own arrow-key navigation.
    if (this.#parent) {
      const parent = this.#parent;
      effect(() => {
        if (this.isFocused()) parent.claimTabStop(this);
      });
    }
  }

  focus(): void {
    this.#focused.focus();
  }

  blur(): void {
    this.#focused.blur();
  }
}
