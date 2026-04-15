import {afterNextRender, contentChildren, DestroyRef, Directive, inject} from '@angular/core';
import {onClickOutside} from '@signality/core';
import {Anchored, provideAnchoredOpts} from '@terse-ui/core/anchor';
import {IdAttribute, RoleAttribute} from '@terse-ui/core/attributes';
import {OnFocusOut, OnKeyDown} from '@terse-ui/core/events';
import {Hover} from '@terse-ui/core/interactions';
import {RovingFocus} from '@terse-ui/core/roving-focus';
import {injectElement, Timeout} from '@terse-ui/core/utils';
import {MenuItem} from './menu-item';
import {MenuTrigger} from './menu-trigger';

@Directive({
  hostDirectives: [Anchored, RovingFocus, IdAttribute, RoleAttribute, OnKeyDown, Hover, OnFocusOut],
  providers: [provideAnchoredOpts({side: 'bottom span-right'})],
})
export class Menu {
  /** Typeahead buffer reset window. */
  static readonly TYPEAHEAD_RESET_MS = 500;

  readonly element = injectElement();
  readonly trigger = inject(MenuTrigger);
  readonly id = inject(IdAttribute).value;
  readonly focusGroup = inject(RovingFocus);
  readonly hovered = inject(Hover);

  readonly items = contentChildren(MenuItem, {descendants: true});

  readonly #typeaheadTimer = new Timeout();
  #typeaheadBuffer = '';

  constructor() {
    inject(RoleAttribute).value.pipe(({current}) => current ?? 'menu');

    this.#wireKeys();
    this.#wireLifecycle();
  }

  #wireKeys(): void {
    // Prepend so we run before RovingFocus' own OnKeyDown handler and can
    // claim Escape/Tab/ArrowLeft/typeahead first.
    inject(OnKeyDown).pipe(
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

    afterNextRender(() => {
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

    inject(OnFocusOut).pipe(({event, next}) => {
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
