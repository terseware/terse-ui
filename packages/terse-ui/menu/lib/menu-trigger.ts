import {
  computed,
  Directive,
  DOCUMENT,
  effect,
  inject,
  INJECTOR,
  input,
  signal,
  TemplateRef,
  ViewContainerRef,
  type Signal,
  type Type,
} from '@angular/core';
import {activeElement, listener} from '@signality/core';
import {setupSync} from '@signality/core/browser/listener';
import {Controllable, hostEvent, Hoverable, OpenClose} from '@terse-ui/core';
import {Anchor} from '@terse-ui/core/anchor';
import {Button} from '@terse-ui/core/button';
import {injectElement, Timeout} from '@terse-ui/utils';
import {Menu} from './menu';

/** Accepted `menuTriggerFor` shapes. */
export type MenuTriggerFor = Menu | Type<object> | TemplateRef<unknown>;

/**
 * Why a menu was closed. `'escape'` closes only the current level; every
 * other reason closes the whole submenu chain back to the top-level trigger.
 */
export type MenuCloseReason = 'click' | 'escape' | 'tab' | 'outside';

/** Which item the next `open()` should focus. */
export type MenuOpenFocus = 'first' | 'last';

@Directive({
  hostDirectives: [Button, OpenClose, Anchor, Hoverable],
  host: {
    'aria-haspopup': 'menu',
  },
})
export class MenuTrigger {
  readonly element = injectElement();
  readonly #activeElement = activeElement();

  readonly menuTriggerFor = input<MenuTriggerFor>();

  readonly opened = inject(OpenClose).state;

  readonly #parent = inject(Menu, {optional: true, skipSelf: true});
  readonly isSubmenu = !!this.#parent;
  readonly isSelfOrParentOpen = computed(() => this.opened() || !!this.#parent?.trigger.opened());

  readonly openFocus = signal<MenuOpenFocus>('first');
  readonly #menu = signal<Menu | null>(null);
  readonly menu = this.#menu.asReadonly();

  readonly #doc = inject(DOCUMENT);
  readonly #injector = inject(INJECTOR);
  readonly #mouseUpTimeout = Timeout.create();
  readonly #allowMouseUpReplay = signal(false);
  readonly allowItemClickOnMouseUp: Signal<boolean> =
    // eslint-disable-next-line @angular-eslint/no-uncalled-signals
    this.#parent?.trigger.allowItemClickOnMouseUp ?? this.#allowMouseUpReplay.asReadonly();

  constructor() {
    const hover = inject(Hoverable);

    // Wire OpenClose to reflect our signal, plus (for submenu) keep it true
    // while pointer is over trigger OR its rendered submenu.
    if (this.isSubmenu) {
      this.opened.intercept(({next}) => {
        let value = next();
        if (hover.hovered() || !!this.#menu()?.hovered.hovered()) {
          value = true;
        }
        return value;
      });
    }

    // aria-controls follows the rendered menu's id.
    inject(Controllable).register(() => this.#menu()?.id);

    hostEvent('keydown', ({event, next}) => {
      if (this.isSubmenu) {
        if (event.key === 'ArrowRight' && !this.opened()) {
          event.preventDefault();
          event.stopPropagation();
          this.open('first');
          return;
        }
        if (event.key === 'ArrowLeft' && this.opened()) {
          event.preventDefault();
          event.stopPropagation();
          this.close('escape');
          return;
        }
      } else {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          const menu = this.#menu();
          if (menu) menu.focusGroup.focusFirst();
          else this.open('first');
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          const menu = this.#menu();
          if (menu) menu.focusGroup.focusLast();
          else this.open('last');
          return;
        }
      }

      if (event.key === 'Escape' && this.opened()) {
        event.preventDefault();
        event.stopPropagation();
        this.close('escape');
        return;
      }

      if (event.key === ' ' || event.key === 'Enter') {
        // Let Button (on native <button>) handle native activation via
        // click; for non-native, prevent default and toggle explicitly.
        // The subsequent click/keyup will toggle — but tests dispatch a
        // raw keydown on a <button> trigger, so we need to open here.
        // Only prevent + toggle when the menu is closed (so Space inside
        // an open menu isn't affected by the trigger's binding).
        if (!this.opened()) {
          event.preventDefault();
          this.toggle();
        }
        return;
      }

      next();
    });

    hostEvent('mousedown', ({next}) => {
      next();
      if (this.opened()) {
        this.close('escape');
        return;
      }

      this.open('first');
      this.#allowMouseUpReplay.set(false);
      this.#mouseUpTimeout.set(200, () => this.#allowMouseUpReplay.set(true));

      setupSync(() =>
        listener.once(
          this.#doc,
          'mouseup',
          () => {
            this.#mouseUpTimeout.clear();
            this.#allowMouseUpReplay.set(false);
          },
          {injector: this.#injector},
        ),
      );
    });

    hostEvent('focusout', ({event, next}) => {
      next();
      if (!this.opened()) return;
      const related = event.relatedTarget as Node | null;
      if (!this.element?.contains(related) && !this.#menu()?.element.contains(related)) {
        this.close('outside');
      }
    });

    const vcr = inject(ViewContainerRef);
    const injector = inject(INJECTOR);

    effect((onCleanup) => {
      if (!this.opened()) return;
      const content = this.menuTriggerFor();
      if (!content) return;

      if (content instanceof Menu) {
        this.setMenu(content);
        return;
      }

      const ref =
        content instanceof TemplateRef
          ? vcr.createEmbeddedView(content, {$implicit: this}, {injector})
          : vcr.createComponent(content, {injector});

      onCleanup(() => ref.destroy());
    });

    // Safety net for programmatic closes that bypass close(). Only tracks
    // #menu() — the activeElement is read lazily inside the cleanup so
    // ordinary focus moves WITHIN the menu don't trigger a focus-back.
    effect((onCleanup) => {
      const menu = this.#menu();
      if (!menu) return;
      onCleanup(() => {
        const active = this.#doc.activeElement;
        if (menu.element.contains(active) || active === this.#doc.body) {
          this.element?.focus();
        }
      });
    });
  }

  setMenu(menu: Menu): () => void {
    this.#menu.set(menu);
    return () => this.#menu.set(null);
  }

  open(focus: MenuOpenFocus = 'first'): void {
    this.openFocus.set(focus);
    this.opened.set(true);
  }

  toggle(): void {
    this.opened.update((v) => !v);
  }

  close(reason: MenuCloseReason = 'click'): void {
    this.opened.set(false);

    const menu = this.#menu();
    const activeElement = this.#activeElement();
    if (
      menu &&
      this.element &&
      (menu.element.contains(activeElement) || activeElement === this.#doc.body)
    ) {
      this.element.focus();
    }

    if (this.isSubmenu && reason !== 'escape') {
      this.#parent?.trigger.close(reason);
    }
  }
}
