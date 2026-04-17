import {computed, Directive, inject, model} from '@angular/core';
import {Button} from '@terse-ui/core/button';
import {OnClick, OnMouseUp, OnPointerEnter} from '@terse-ui/core/events';
import {RovingFocusItem} from '@terse-ui/core/roving-focus';
import {Focusable, Hoverable, Identity} from '@terse-ui/core/src';
import {injectElement} from '@terse-ui/core/utils';
import {Menu} from './menu';
import {MenuTrigger} from './menu-trigger';

/**
 * A focusable, activatable item inside a {@link Menu}.
 *
 * Composes:
 * - {@link CompositeItem} — Space-on-keydown activation + text-nav role
 *   handling + Disabler + Button.
 * - {@link RovingFocusItem} — tabindex orchestration and Focus tracking.
 * - {@link Hover} — pointer hover state for highlight reflection.
 *
 * Responsibilities unique to MenuItem:
 * - Set `role="menuitem"` (unless the host already carries one).
 * - Reflect highlight state via `data-highlighted` (hover OR focused).
 * - Close the trigger on click unless the item is itself a submenu trigger
 *   or `closeOnClick` has been set to `false`.
 * - Focus on pointer enter (mouse only — touch is ignored to avoid
 *   fighting roving focus on touch scroll).
 * - Replay a click on `mouseup` during the trigger's mouseup-replay window
 *   so the drag-to-select pattern activates without requiring a full click.
 */
@Directive({
  hostDirectives: [
    Button,
    RovingFocusItem,
    Focusable,
    Hoverable,
    Identity,
    OnClick,
    OnPointerEnter,
    OnMouseUp,
  ],
  host: {
    '[attr.data-highlighted]': 'isHighlighted() ? "" : null',
  },
})
export class MenuItem {
  readonly element = injectElement();
  readonly #rovingItem = inject(RovingFocusItem);
  readonly #hover = inject(Hoverable);
  readonly #focus = inject(Focusable);

  readonly #parentMenu = inject(Menu);
  readonly trigger = this.#parentMenu.trigger;

  readonly #selfTrigger = inject(MenuTrigger, {optional: true, self: true});

  readonly isActive = computed(() => this.#focus.isActiveElement());
  readonly isHighlighted = computed(() => this.#hover.hovered() || this.isActive());

  readonly closeOnClick = model(true);

  constructor() {
    this.#focus.composite.append(true);

    inject(Identity).role.intercept(({next}) => next('menuitem'));

    inject(OnClick).intercept(({next}) => {
      next();
      if (this.#selfTrigger) return;
      if (!this.closeOnClick()) return;
      this.trigger.close('click');
    });

    inject(OnPointerEnter).intercept(({event, next}) => {
      next();
      if (event.pointerType === 'touch') return;
      this.focus();
    });

    inject(OnMouseUp).intercept(({next}) => {
      next();
      if (this.trigger.allowItemClickOnMouseUp()) {
        this.element.click();
      }
    });
  }

  focus(): void {
    this.#rovingItem.focusItem();
  }

  blur(): void {
    this.#rovingItem.blurItem();
  }
}
