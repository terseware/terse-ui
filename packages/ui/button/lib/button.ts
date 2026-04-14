import {Directive, HOST_TAG_NAME, inject, InjectionToken, type Provider} from '@angular/core';
import {Disabler, Role, TabIndex, Type} from '@terseware/ui/atoms';
import {
  injectElement,
  isAnchorElement,
  isButtonElement,
  isInputElement,
} from '@terseware/ui/internal';
import {fallback} from '@terseware/ui/state';

const COMPOSITE_BUTTON = new InjectionToken<true>(ngDevMode ? 'COMPOSITE_BUTTON' : '');
export function provideCompositeButton(): Provider {
  return {provide: COMPOSITE_BUTTON, useValue: true};
}

/**
 * Cross-element button behavior. Ensures `role="button"` and
 * `type="button"` on non-native hosts and synthesizes click for
 * keyboard activation on anything that isn't already a real button.
 *
 * Native `<button>`, `<input type="button|submit|reset|image">`, and
 * `<a href>` already dispatch clicks from Enter / Space themselves, so
 * this directive registers zero key handlers on them and lets the
 * browser do its thing — attempting to layer synthesis on top would
 * double-fire the click under real user input.
 *
 * For non-native hosts (`<div>`, `<span>`, ...) the directive mirrors
 * the native activation contract:
 *
 * - **Enter** fires click on *keydown*. That matches how browsers
 *   handle Enter on a real button: the press immediately activates
 *   and a repeat key can re-fire. `preventDefault` suppresses any
 *   ambient default action (form submit, scroll).
 *
 * - **Space** fires click on *keyup*. A keydown handler only runs to
 *   `preventDefault` the browser's default scroll; click synthesis
 *   waits for release so activation latches to lift, again matching
 *   a real `<button>`.
 *
 * Keyboard handling is routed through the shared `Keys` registry so
 * downstream composites (menu items, combobox options, etc.) can
 * layer their own bindings on the same host with deterministic
 * ordering and `when`-predicate coordination.
 */
@Directive({
  selector: '[button]:not([unterse-button]):not([unterse])',
  exportAs: 'button',
  hostDirectives: [
    {directive: Disabler, inputs: ['disabled', 'softDisabled']},
    {directive: TabIndex, inputs: ['tabIndex']},
    {directive: Role, inputs: ['role']},
    {directive: Type, inputs: ['type']},
  ],
  host: {
    '(keydown)': 'onKeyDown($event)',
    '(keyup)': 'onKeyUp($event)',
  },
})
export class Button {
  readonly #element = injectElement();
  readonly #isButton = inject(HOST_TAG_NAME) === 'button';
  readonly #composite = !!inject(COMPOSITE_BUTTON, {optional: true, self: true});

  // These must be used in a getter because href and routerLink appears after rendering.

  get #isLink(): boolean {
    return isAnchorElement(this.#element, {validLink: true});
  }
  get #isBtnRole(): boolean {
    return this.#isButton || this.#isLink || this.#isInput;
  }
  get #isInput(): boolean {
    return isInputElement(this.#element, {
      types: ['button', 'submit', 'reset', 'image'],
    });
  }

  readonly #disabler = inject(Disabler);
  readonly disabled = this.#disabler.asReadonly();
  readonly softDisabled = this.#disabler.soft;

  constructor() {
    fallback(Role, (role) => role ?? (this.#isBtnRole ? null : 'button'));
    fallback(Type, (type) => type ?? (this.#isButton ? 'button' : null));
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    const isCurrentTarget = event.target === event.currentTarget;
    const currentTarget = event.currentTarget as HTMLElement;
    const isButton = isButtonElement(currentTarget);
    const isLink = !this.#isButton && isAnchorElement(currentTarget, {validLink: true});
    const shouldClick = isCurrentTarget && (this.#isButton ? isButton : !isLink);
    const isEnterKey = event.key === 'Enter';
    const isSpaceKey = event.key === ' ';
    const role = currentTarget.getAttribute('role');
    const isTextNavigationRole =
      role?.startsWith('menuitem') || role === 'option' || role === 'gridcell';

    if (isCurrentTarget && this.#composite && isSpaceKey) {
      if (event.defaultPrevented && isTextNavigationRole) {
        return;
      }

      event.preventDefault();

      if (isLink || (this.#isButton && isButton)) {
        currentTarget.click();
      } else if (shouldClick) {
        this.#element.click();
      }

      return;
    }

    // Keyboard accessibility for native and non-native elements.
    if (shouldClick) {
      if (!this.#isButton && (isSpaceKey || isEnterKey)) {
        event.preventDefault();
      }
      if (!this.#isButton && isEnterKey) {
        this.#element.click();
      }
    }
  }

  protected onKeyUp(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    if (
      event.target === event.currentTarget &&
      this.#isButton &&
      this.#composite &&
      isButtonElement(event.currentTarget as HTMLElement) &&
      event.key === ' '
    ) {
      event.preventDefault();
      return;
    }

    // Keyboard accessibility for non interactive elements
    if (
      event.target === event.currentTarget &&
      !this.#isButton &&
      !this.#composite &&
      event.key === ' '
    ) {
      this.#element.click();
    }
  }
}
