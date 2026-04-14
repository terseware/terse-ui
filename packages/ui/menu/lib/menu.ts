import {afterNextRender, contentChildren, DestroyRef, Directive, inject} from '@angular/core';
import {onClickOutside} from '@signality/core';
import {Anchored, provideAnchoredOpts} from '@terseware/ui/anchor';
import {Identifier, Keys, Role} from '@terseware/ui/atoms';
import {Hovered} from '@terseware/ui/interactions';
import {injectElement, Timeout} from '@terseware/ui/internal';
import {RovingFocus} from '@terseware/ui/roving-focus';
import {MenuItem} from './menu-item';
import {MenuTrigger} from './menu-trigger';

/**
 * Menu popup. Hosts a roving-focus group of `MenuItem`s, anchors to its
 * owning `MenuTrigger`, closes on Escape / Tab / outside click / focus
 * leaving the subtree, and supports single-character type-ahead.
 *
 * Placement is exposed via re-aliased `Anchored` inputs — consumers bind
 * directly on the menu element:
 *
 * ```html
 * <div menu side="bottom center" margin="8px">…</div>
 * ```
 */
@Directive({
  selector: '[menu]:not([unterse-menu]):not([unterse])',
  exportAs: 'menu',
  hostDirectives: [
    {
      directive: Anchored,
      inputs: ['anchoredSide:side', 'anchoredMargin:margin'],
    },
    RovingFocus,
    Identifier,
    Role,
    Keys,
    Hovered,
  ],
  providers: [provideAnchoredOpts({side: 'bottom span-right'})],
  host: {
    '(focusout)': 'onFocusOut($event)',
  },
})
export class Menu {
  /** Typeahead buffer reset window. */
  static readonly TYPEAHEAD_RESET_MS = 500;

  readonly element = injectElement();
  readonly trigger = inject(MenuTrigger);
  readonly id = inject(Identifier);
  readonly focusGroup = inject(RovingFocus);
  readonly hovered = inject(Hovered);

  readonly items = contentChildren(MenuItem, {descendants: true});

  readonly #typeaheadTimer = new Timeout();
  #typeaheadBuffer = '';

  constructor() {
    inject(Role).override(() => 'menu');

    this.#wireKeys();
    this.#wireLifecycle();
  }

  #wireKeys(): void {
    const keys = inject(Keys);

    keys.down('Escape', () => this.trigger.close('escape'));
    keys.down('Tab', () => this.trigger.close('tab'));

    // Submenu-only: ArrowLeft backs out one level, letting the user walk
    // out of a nested menu without collapsing the whole chain.
    keys.down('ArrowLeft', () => this.trigger.close('escape'), {
      when: () => this.trigger.isSubmenu,
    });

    // Typeahead. Any single character (after-modifier match only, since
    // `Modifier.None` is the default) starts / extends the search buffer.
    // `stopPropagation: false` so the character still reaches the document
    // in case an outer layer cares.
    keys.down(/^.$/u, (event) => this.#typeahead(event.key), {stopPropagation: false});
  }

  #wireLifecycle(): void {
    // Register with the trigger so focus-return and aria-controls work.
    // Unregister on destroy.
    inject(DestroyRef).onDestroy(this.trigger.setMenu(this));

    // Apply the trigger's requested initial focus once items are rendered,
    // then reset the intent to `'first'` for the next open.
    afterNextRender(() => {
      if (this.trigger.openFocus() === 'last') {
        this.focusGroup.focusLast();
      } else {
        this.focusGroup.focusFirst();
      }
      this.trigger.openFocus.set('first');
    });

    onClickOutside(this.element, () => this.trigger.close('outside'), {
      ignore: [this.trigger.element],
    });
  }

  #typeahead(char: string): void {
    this.#typeaheadBuffer += char.toLowerCase();

    const match = this.items().find((item) =>
      item.element.textContent?.trim().toLowerCase().startsWith(this.#typeaheadBuffer),
    );
    if (match) match.focus();

    this.#typeaheadTimer.set(Menu.TYPEAHEAD_RESET_MS, () => {
      this.#typeaheadBuffer = '';
    });
  }

  protected onFocusOut(event: FocusEvent): void {
    // Don't close while the chain is still active — focus transitions
    // between a menu and its submenu fire a focusout on the outer menu.
    if (this.trigger.isSelfOrParentOpen()) return;

    const related = event.relatedTarget as Node | null;
    if (!related) {
      this.trigger.close('outside');
      return;
    }

    const menuEl = event.currentTarget as HTMLElement;
    if (!menuEl.contains(related) && !this.trigger.element?.contains(related)) {
      this.trigger.close('outside');
    }
  }
}
