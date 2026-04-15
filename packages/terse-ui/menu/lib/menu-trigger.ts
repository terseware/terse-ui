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
import {Anchor} from '@terse-ui/core/anchor';
import {AriaControls, AriaHasPopup, OpenClose} from '@terse-ui/core/attributes';
import {Button} from '@terse-ui/core/button';
import {OnFocusOut, OnKeyDown, OnMouseDown} from '@terse-ui/core/events';
import {Hover} from '@terse-ui/core/interactions';
import {injectElement, Timeout} from '@terse-ui/core/utils';
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
  hostDirectives: [
    Button,
    OpenClose,
    Anchor,
    AriaHasPopup,
    AriaControls,
    OnKeyDown,
    Hover,
    OnMouseDown,
    OnFocusOut,
  ],
})
export class MenuTrigger {
  readonly element = injectElement();
  readonly #activeElement = activeElement();

  readonly menuTriggerFor = input<MenuTriggerFor>();

  readonly #openClose = inject(OpenClose);
  readonly #opened = signal(false);
  readonly opened = this.#opened.asReadonly();

  readonly #parentMenu = inject(Menu, {optional: true});
  readonly isSubmenu = !!this.#parentMenu;

  readonly isSelfOrParentOpen = computed(
    () => this.#opened() || !!this.#parentMenu?.trigger.opened(),
  );

  readonly openFocus = signal<MenuOpenFocus>('first');
  readonly #menu = signal<Menu | null>(null);

  readonly #doc = inject(DOCUMENT);
  readonly #injector = inject(INJECTOR);
  readonly #mouseUpTimeout = new Timeout();
  readonly #allowMouseUpReplay = signal(false);
  readonly allowItemClickOnMouseUp: Signal<boolean> =
    // eslint-disable-next-line @angular-eslint/no-uncalled-signals
    this.#parentMenu?.trigger.allowItemClickOnMouseUp ?? this.#allowMouseUpReplay.asReadonly();

  constructor() {
    const hover = inject(Hover);

    // Wire OpenClose to reflect our signal, plus (for submenu) keep it true
    // while pointer is over trigger OR its rendered submenu.
    this.#openClose.value.pipe(() => {
      if (this.isSubmenu) {
        return this.#opened() || hover.hovered() || !!this.#menu()?.hovered.hovered();
      }
      return this.#opened();
    });

    inject(AriaHasPopup).value.pipe(({next}) => next('menu'));

    // aria-controls follows the rendered menu's id.
    const ariaControls = inject(AriaControls);
    ariaControls.value.pipe(({current, next}) => {
      const menu = this.#menu();
      return next(menu ? [...current, menu.id] : current);
    });

    this.#wireKeys();
    this.#wireMouseDown();
    this.#wireFocusOut();
    this.#wireMenuMaterialization();
    this.#wireFocusBackOnClose();
  }

  #wireKeys(): void {
    inject(OnKeyDown).pipe(
      ({event, next, preventDefault}) => {
        const key = event.key;

        if (this.isSubmenu) {
          if (key === 'ArrowRight' && !this.#opened()) {
            preventDefault();
            event.stopPropagation();
            this.open('first');
            return;
          }
          if (key === 'ArrowLeft' && this.#opened()) {
            preventDefault();
            event.stopPropagation();
            this.close('escape');
            return;
          }
        } else {
          if (key === 'ArrowDown') {
            preventDefault();
            event.stopPropagation();
            const menu = this.#menu();
            if (menu) menu.focusGroup.focusFirst();
            else this.open('first');
            return;
          }
          if (key === 'ArrowUp') {
            preventDefault();
            event.stopPropagation();
            const menu = this.#menu();
            if (menu) menu.focusGroup.focusLast();
            else this.open('last');
            return;
          }
        }

        if (key === 'Escape' && this.#opened()) {
          preventDefault();
          event.stopPropagation();
          this.close('escape');
          return;
        }

        if (key === ' ' || key === 'Enter') {
          // Let Button (on native <button>) handle native activation via
          // click; for non-native, prevent default and toggle explicitly.
          // The subsequent click/keyup will toggle — but tests dispatch a
          // raw keydown on a <button> trigger, so we need to open here.
          // Only prevent + toggle when the menu is closed (so Space inside
          // an open menu isn't affected by the trigger's binding).
          if (!this.#opened()) {
            preventDefault();
            this.toggle();
          }
          return;
        }

        next();
      },
      {prepend: true},
    );
  }

  #wireMouseDown(): void {
    inject(OnMouseDown).pipe(({next}) => {
      next();
      if (this.#opened()) {
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
  }

  #wireFocusOut(): void {
    inject(OnFocusOut).pipe(({event, next}) => {
      next();
      if (!this.#opened()) return;
      const related = event.relatedTarget as Node | null;
      if (!this.element?.contains(related) && !this.#menu()?.element.contains(related)) {
        this.close('outside');
      }
    });
  }

  #wireMenuMaterialization(): void {
    const vcr = inject(ViewContainerRef);
    const injector = inject(INJECTOR);

    effect((onCleanup) => {
      if (!this.#opened()) return;
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
  }

  #wireFocusBackOnClose(): void {
    // Async focus-back safety net. The sync branch in close() handles most
    // cases; this covers programmatic closes that bypass close().
    effect((onCleanup) => {
      const menu = this.#menu();
      if (!menu) return;
      const activeElement = this.#activeElement();
      onCleanup(() => {
        if (menu.element.contains(activeElement) || activeElement === this.#doc.body) {
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
    this.#opened.set(true);
  }

  toggle(): void {
    this.#opened.update((v) => !v);
  }

  close(reason: MenuCloseReason = 'click'): void {
    this.#opened.set(false);

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
      this.#parentMenu?.trigger.close(reason);
    }
  }
}
