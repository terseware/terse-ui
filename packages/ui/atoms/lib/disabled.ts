import {booleanAttribute, computed, Directive, input, linkedSignal} from '@angular/core';
import {listener} from '@signality/core';
import {hasDisabledAttribute, injectElement} from '@terseware/ui/internal';
import {override, pipe, State} from '@terseware/ui/state';
import {AriaDisabled, DataDisabled, Disabled} from './attr';
import {TabIndex} from './tab-index';

/**
 * Unified disabled-state directive. Accepts both `disabled` (hard) and
 * `softDisabled` (soft — focusable, click-blocked, aria-disabled) inputs
 * on a single instance so downstream composition does not have to juggle
 * two directives that reference each other via `forwardRef`.
 *
 * Variant resolution: `softDisabled` wins over `disabled`, so an element
 * that is both hard- and soft-disabled renders as soft (focusable,
 * aria-disabled) rather than being pulled out of the tab order.
 */
@Directive({
  exportAs: 'disabler',
  hostDirectives: [TabIndex, Disabled, DataDisabled, AriaDisabled],
  host: {
    '(keydown)': 'onKeyDown($event)',
  },
})
export class Disabler extends State<boolean> {
  readonly #element = injectElement();
  readonly #native = hasDisabledAttribute(this.#element);

  readonly disabledInput = input(false, {transform: booleanAttribute, alias: 'disabled'});
  readonly softDisabledInput = input(false, {
    transform: booleanAttribute,
    alias: 'softDisabled',
  });

  readonly variant = computed(() => (this.softDisabledInput() ? 'soft' : this() ? 'hard' : null));
  readonly soft = computed(() => this.variant() === 'soft');
  readonly hard = computed(() => this.variant() === 'hard');

  constructor() {
    super(linkedSignal(() => this.softDisabledInput() || this.disabledInput()));

    override(Disabled, () => !this.soft() && this());
    override(DataDisabled, () => this.variant());
    override(AriaDisabled, () => {
      if ((this.#native && this.soft()) || (!this.#native && this())) {
        return String(this());
      }
      return null;
    });

    pipe(TabIndex, (tabIndex) => {
      if (!this.#native && this()) {
        tabIndex = this.soft() ? tabIndex : Math.min(-1, tabIndex);
      }
      return tabIndex;
    });

    listener.capture(this.#element, 'click', (event) => {
      if (this()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.soft() && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
    }
  }
}
