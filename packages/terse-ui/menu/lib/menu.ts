import {contentChildren, DestroyRef, Directive, effect, inject} from '@angular/core';
import {onClickOutside} from '@signality/core';
import {Hoverable, Identifier, Identity} from '@terse-ui/core';
import {Anchored, provideAnchoredOpts} from '@terse-ui/core/anchor';
import {OnFocusOut, OnKeyDown} from '@terse-ui/core/events';
import {RovingFocus} from '@terse-ui/core/roving-focus';
import {injectElement, Timeout} from '@terse-ui/core/utils';
import {MenuItem} from './menu-item';
import {MenuTrigger} from './menu-trigger';

@Directive({
  hostDirectives: [Anchored, RovingFocus, Identity, Identifier, OnKeyDown, Hoverable, OnFocusOut],
  providers: [
    provideAnchoredOpts(() => ({
      side: inject(MenuTrigger, {optional: true})?.isSubmenu
        ? 'right span-bottom'
        : 'bottom span-right',
    })),
  ],
})
export class Menu {
  /** Typeahead buffer reset window. */
  static readonly TYPEAHEAD_RESET_MS = 500;

  readonly element = injectElement();
  readonly trigger = inject(MenuTrigger);
  readonly id = inject(Identifier).value;
  readonly identity = inject(Identity);
  readonly focusGroup = inject(RovingFocus);
  readonly hovered = inject(Hoverable);

  readonly items = contentChildren(MenuItem, {descendants: true});

  readonly #typeaheadTimer = new Timeout();
  #typeaheadBuffer = '';

  constructor() {
    this.identity.role.intercept(({next}) => next('menu'));
    this.#wireKeys();
    this.#wireLifecycle();
  }

  #wireKeys(): void {
    // Prepend so we run before RovingFocus' own OnKeyDown handler and can
    // claim Escape/Tab/ArrowLeft/typeahead first.
    inject(OnKeyDown).intercept(
      ({event, next, preventDefault}) => {
        const key = event.key;

        if (key === 'Escape') {
          preventDefault();
          event.stopPropagation();
          this.trigger.close('escape');
          return;
        }

        if (key === 'Tab') {
          preventDefault();
          event.stopPropagation();
          this.trigger.close('tab');
          return;
        }

        if (key === 'ArrowLeft' && this.trigger.isSubmenu) {
          preventDefault();
          event.stopPropagation();
          this.trigger.close('escape');
          return;
        }

        // Typeahead: single-character keys with no modifiers.
        if (
          key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          /^.$/u.test(key)
        ) {
          preventDefault();
          // Intentionally NO stopPropagation — let the char bubble.
          this.#typeahead(key);
          return;
        }

        next();
      },
      {prepend: true},
    );
  }

  #wireLifecycle(): void {
    inject(DestroyRef).onDestroy(this.trigger.setMenu(this));

    // Fire as soon as the roving-focus item registry is non-empty (which
    // happens synchronously after the embedded view's items construct),
    // then no-op for the rest of this menu's lifetime.
    let focusDone = false;
    effect(() => {
      if (focusDone) return;
      const items = this.focusGroup.items();
      if (items.length === 0) return;
      focusDone = true;
      if (this.trigger.openFocus() === 'last') {
        this.focusGroup.focusLast();
      } else {
        this.focusGroup.focusFirst();
      }
      this.trigger.openFocus.set('first');
    });

    onClickOutside(this.element, () => this.trigger.close('outside'), {
      ignore: this.trigger.element ? [this.trigger.element] : [],
    });

    inject(OnFocusOut).intercept(({event, next}) => {
      next();
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
}
