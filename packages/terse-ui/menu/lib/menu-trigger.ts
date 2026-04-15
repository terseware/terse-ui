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
import {listener} from '@signality/core';
import {setupSync} from '@signality/core/browser/listener';
import {Anchor} from '@terseware/ui/anchor';
import {AriaControls, AriaHasPopup, Discloser, Keys} from '@terseware/ui/atoms';
import {Hovered} from '@terseware/ui/interactions';
import {injectElement, Timeout} from '@terseware/ui/internal';
import {Menu} from './menu';

/** Accepted `menuTriggerFor` shapes. */
export type MenuTriggerFor = Menu | Type<object> | TemplateRef<unknown>;

/**
 * Why a menu was closed — decides whether the close chains up the submenu
 * stack. `'escape'` closes only the current level; every other reason
 * closes the whole chain back to the top-level trigger.
 */
export type MenuCloseReason = 'click' | 'escape' | 'tab' | 'outside';

/** Which item the next `open()` should focus. */
export type MenuOpenFocus = 'first' | 'last';

/**
 * Menu trigger behavior. The *same* directive powers top-level triggers
 * and submenu-trigger menu items — submenu mode is detected via DI
 * (presence of a parent `Menu`). Key bindings and close-chain semantics
 * branch on that.
 *
 * Does not compose `Button`; pair with a native `<button>` or apply
 * `Button` explicitly for activation semantics.
 */
@Directive({
  selector: '[menuTrigger]:not([unterse-menuTrigger]):not([unterse])',
  exportAs: 'menuTrigger',
  hostDirectives: [Discloser, Anchor, AriaHasPopup, AriaControls, Keys, Hovered],
  host: {
    '(mousedown)': 'onMouseDown()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class MenuTrigger {
  readonly element = injectElement();
  readonly opened = inject(Discloser);

  readonly menuTriggerFor = input<MenuTriggerFor>();

  /** Containing `Menu`, if any — drives submenu detection and chain closes. */
  readonly #parentMenu = inject(Menu, {optional: true});
  readonly isSubmenu = !!this.#parentMenu;

  /**
   * True when this trigger's own menu or any parent in the chain is still
   * open. Used by `Menu.onFocusOut` to decide whether a focus transition
   * should collapse the stack.
   */
  readonly isSelfOrParentOpen = computed(
    () => this.opened() || !!this.#parentMenu?.trigger.opened(),
  );

  /**
   * Which item the next menu render should focus. Set by arrow-key openers
   * before calling `open()`, and reset to `'first'` by `Menu` once consumed.
   */
  readonly openFocus = signal<MenuOpenFocus>('first');

  readonly #menu = signal<Menu | null>(null);

  // ---------------------------------------------------------------------
  // Construction: wire up the six behaviors.
  // ---------------------------------------------------------------------

  constructor() {
    inject(AriaHasPopup).override(() => 'menu');

    const keys = inject(Keys);
    const hovered = inject(Hovered);

    // Submenu triggers are considered "open" while the pointer is anywhere
    // inside the logical hover zone — the trigger itself OR its rendered
    // submenu. Without the menu-side check, moving the pointer from the
    // trigger button into the submenu (which is a visually-adjacent sibling,
    // not a DOM descendant of the trigger) flips `hovered` to false and
    // collapses the chain mid-navigation.
    if (this.isSubmenu) {
      this.opened.pipe((opened) => opened || hovered() || !!this.#menu()?.hovered());
    }

    this.#wireOpenKeys(keys);
    this.#wireToggleKeys(keys);
    this.#wireAriaControls();
    this.#wireMenuMaterialization();
  }

  #wireOpenKeys(keys: Keys): void {
    if (this.isSubmenu) {
      // Submenu inside a (LTR) vertical parent: ArrowRight opens it and
      // focuses the first item; ArrowLeft closes it back to the parent.
      keys.down('ArrowRight', () => this.open('first'), {when: () => !this.opened()});
      keys.down('ArrowLeft', () => this.close('escape'), {when: () => this.opened()});
      return;
    }

    // Top-level: if the menu is already up, arrow just moves focus within
    // the items; otherwise it opens with the appropriate initial focus.
    keys.down('ArrowDown', () => {
      const menu = this.#menu();
      if (menu) menu.focusGroup.focusFirst();
      else this.open('first');
    });
    keys.down('ArrowUp', () => {
      const menu = this.#menu();
      if (menu) menu.focusGroup.focusLast();
      else this.open('last');
    });
  }

  #wireToggleKeys(keys: Keys): void {
    // Escape on a focused trigger matters only when its own menu happens
    // to be open — uncommon since open moves focus into the menu, but
    // possible via programmatic opens. `when` keeps default preventDefault
    // / stopPropagation off when the menu is closed, letting Escape bubble.
    keys.down('Escape', () => this.close('escape'), {when: () => this.opened()});
    keys.down(' ', () => this.toggle());
    keys.down('Enter', () => this.toggle());
  }

  #wireAriaControls(): void {
    const ariaControls = inject(AriaControls);
    effect((onCleanup) => {
      const menu = this.#menu();
      if (!menu) return;

      const removeControl = ariaControls.add(menu.id);
      onCleanup(() => {
        removeControl();
        // Async focus-back as a safety net for programmatic closes that
        // don't route through close() (e.g., outer destroy of the trigger's
        // template). The sync branch in close() handles the common case.
        if (
          menu.element.contains(document.activeElement) ||
          document.activeElement === document.body
        ) {
          this.element?.focus();
        }
      });
    });
  }

  #wireMenuMaterialization(): void {
    const vcr = inject(ViewContainerRef);
    const injector = inject(INJECTOR);

    effect((onCleanup) => {
      if (!this.opened()) return;
      const content = this.menuTriggerFor();
      if (!content) return;

      // Three input shapes: a live Menu rendered elsewhere, a TemplateRef
      // to embed, or a component type to instantiate. Only the latter two
      // create a view we own; the live-Menu case just registers.
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

  // ---------------------------------------------------------------------
  // Public state API.
  // ---------------------------------------------------------------------

  setMenu(menu: Menu): () => void {
    this.#menu.set(menu);
    return () => this.#menu.set(null);
  }

  /** Open the menu, optionally specifying which item should receive focus. */
  open(focus: MenuOpenFocus = 'first'): void {
    this.openFocus.set(focus);
    this.opened.set(true);
  }

  toggle(): void {
    this.opened.toggle();
  }

  /**
   * Close this menu. Non-`'escape'` reasons propagate up the submenu
   * chain; `'escape'` closes only this level so that a nested-menu user
   * can back out one step at a time.
   */
  close(reason: MenuCloseReason = 'click'): void {
    this.opened.set(false);

    // Sync focus-back BEFORE the view-destroy effect runs. Otherwise the
    // focused item inside the dying view blurs with relatedTarget=null,
    // which a parent menu's focusout handler would read as "focus left
    // the menu system" and chain-close all the way up. Moving focus here
    // first makes relatedTarget this trigger, so the parent menu correctly
    // sees "still inside me".
    const menu = this.#menu();
    if (
      menu &&
      this.element &&
      (menu.element.contains(document.activeElement) || document.activeElement === document.body)
    ) {
      this.element.focus();
    }

    if (this.isSubmenu && reason !== 'escape') {
      this.#parentMenu?.trigger.close(reason);
    }
  }

  // ---------------------------------------------------------------------
  // Pointer: drag-select click-through window.
  //
  // Native menus open on mousedown and let the user drag to an item and
  // release to activate it. We replicate that without firing an accidental
  // click on quick taps by gating the item's mouseup→click replay behind
  // a ~200ms drag-hold window.
  // ---------------------------------------------------------------------

  readonly #doc = inject(DOCUMENT);
  readonly #injector = inject(INJECTOR);
  readonly #mouseUpTimeout = new Timeout();
  readonly #allowMouseUpReplay = signal(false);
  readonly allowItemClickOnMouseUp: Signal<boolean> =
    // eslint-disable-next-line @angular-eslint/no-uncalled-signals
    this.#parentMenu?.trigger.allowItemClickOnMouseUp ?? this.#allowMouseUpReplay.asReadonly();

  protected onMouseDown(): void {
    if (this.opened()) {
      this.close('escape');
      return;
    }

    this.open('first');

    // Replay window is closed for the first 200ms, then opens so a held
    // drag can end with an item activation. A release anywhere slams it
    // shut regardless of elapsed time.
    this.#allowMouseUpReplay.set(false);
    this.#mouseUpTimeout.set(200, () => this.#allowMouseUpReplay.set(true));

    // Sync attach so we don't miss the release while Angular schedules
    // the next render tick.
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
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!this.opened()) return;

    const related = event.relatedTarget as Node | null;
    if (!this.element?.contains(related) && !this.#menu()?.element.contains(related)) {
      this.close('outside');
    }
  }
}
