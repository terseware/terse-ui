import {computed, Directive, inject, model} from '@angular/core';
import {Keys, Role} from '@terseware/ui/atoms';
import {Button, provideCompositeButton} from '@terseware/ui/button';
import {Hovered} from '@terseware/ui/interactions';
import {injectElement} from '@terseware/ui/internal';
import {RovingFocusItem} from '@terseware/ui/roving-focus';
import {Menu} from './menu';
import {MenuTrigger} from './menu-trigger';

/**
 * Activatable item inside a `Menu`. Participates in the parent's
 * roving-focus group, activates on click / Enter / Space, and closes the
 * containing menu on activation unless `closeOnClick` is `false` (the
 * opt-out used by checkbox/radio variants).
 *
 * Keyboard activation is provided entirely by the composed `Button`,
 * which registers Enter / Space handlers through the shared `Keys`
 * registry (for non-native hosts) and lets the browser handle natives.
 * Because `Button` dispatches through `Keys` like everything else in the
 * library, submenu triggers composed on the same host or consumer code
 * adding extra bindings cooperate without any special coordination —
 * all handlers share one dispatch loop.
 *
 * Sets `data-highlighted` when hovered or focused so consumers can style
 * the "about to activate" state with one attribute.
 */
@Directive({
  selector: '[menuItem]:not([unterse-menuItem]):not([unterse])',
  exportAs: 'menuItem',
  providers: [provideCompositeButton()],
  hostDirectives: [Button, RovingFocusItem, Hovered, Role],
  host: {
    '[attr.data-highlighted]': 'isHighlighted() ? "" : null',
    '(click)': 'onClick()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(mouseup)': 'onMouseUp()',
  },
})
export class MenuItem {
  readonly element = injectElement();
  readonly #rovingItem = inject(RovingFocusItem);
  readonly #hovered = inject(Hovered);

  /**
   * Resolves via the containing `Menu` (not via `self`) so submenu-trigger
   * items see their parent menu's trigger rather than the submenu trigger
   * that lives on the same host.
   */
  readonly #parentMenu = inject(Menu);
  readonly trigger = this.#parentMenu.trigger;

  /**
   * Non-null when this item is itself a submenu trigger. Click handling
   * is delegated to the trigger in that case, so we don't close the
   * parent menu and flicker the just-opened child.
   */
  readonly #selfTrigger = inject(MenuTrigger, {optional: true, self: true});

  readonly isActive = this.#rovingItem.isActive;
  readonly isHighlighted = computed(() => this.#hovered() || this.isActive());

  /**
   * Two-way flag: set to `false` by checkbox/radio variants so toggling
   * state doesn't also dismiss the menu.
   */
  readonly closeOnClick = model(true);

  constructor() {
    inject(Role).override(() => 'menuitem');
    inject(Keys).up(' ', () => this.element.click());
    inject(Keys).down('Enter', () => this.element.click());
  }

  focus(): void {
    this.#rovingItem.focus();
  }

  blur(): void {
    this.#rovingItem.blur();
  }

  protected onClick(): void {
    // Submenu-trigger items: the `MenuTrigger` hostDirective on the same
    // host already toggled the child submenu in mousedown; closing the
    // parent menu here would flicker the just-opened child.
    if (this.#selfTrigger) return;
    if (!this.closeOnClick()) return;
    this.trigger.close('click');
  }

  protected onPointerEnter(event: PointerEvent): void {
    // Touch-emulated pointerenter would pre-focus items before a tap,
    // which is wrong for touch UX.
    if (event.pointerType === 'touch') return;
    this.focus();
  }

  protected onMouseUp(): void {
    // Drag-select replay: during the ~200ms hold window, an item mouseup
    // is promoted into a click (which `onClick` then handles).
    if (this.trigger.allowItemClickOnMouseUp()) {
      this.element.click();
    }
  }
}
