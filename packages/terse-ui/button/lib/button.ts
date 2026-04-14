import {Directive, HOST_TAG_NAME, inject} from '@angular/core';
import {RoleAttribute, TypeAttribute} from '@terse-ui/core/attributes';
import {Disabler} from '@terse-ui/core/disabler';
import {OnKeyDown, OnKeyUp} from '@terse-ui/core/events';
import {
  injectElement,
  isAnchorElement,
  isButtonElement,
  isInputElement,
} from '@terse-ui/core/utils';

/**
 * Base button behavior: disabled states, keyboard activation, and ARIA attributes.
 *
 * Not used directly in templates — compose via `hostDirectives` to build
 * higher-level primitives (menu items, toolbar buttons, toggles).
 *
 * Handles:
 * - Tri-state disabled (`true` | `'soft'` | `false`) with correct `disabled`,
 *   `aria-disabled`, `data-disabled`, and `tabindex` semantics
 * - Keyboard activation: Enter on keydown, Space on keyup (non-native elements)
 * - Native `<button>` detection — defers to browser for Enter/Space handling
 * - Capture-phase event suppression when disabled (blocks template bindings)
 * - Pipeline-level event suppression via OnClick/OnMouseDown/OnPointerDown (composable)
 * - Role/type auto-assignment for non-native elements
 */
@Directive({
  exportAs: 'button',
  hostDirectives: [Disabler, RoleAttribute, TypeAttribute, OnKeyDown, OnKeyUp],
})
export class Button {
  readonly #element = injectElement();
  readonly #isNativeButton = inject(HOST_TAG_NAME) === 'button';

  readonly #disabler = inject(Disabler);
  readonly disabled = this.#disabler.disabled;
  readonly softDisabled = this.#disabler.soft;
  readonly hardDisabled = this.#disabler.hard;

  readonly role = inject(RoleAttribute).value;
  readonly type = inject(TypeAttribute).value;

  readonly #onKeyDown = inject(OnKeyDown);
  readonly #onKeyUp = inject(OnKeyUp);

  // These must be used in a getter because attributes can change dynamically.
  get #isValidLink(): boolean {
    return isAnchorElement(this.#element, {validLink: true});
  }
  get #isButtonInput(): boolean {
    return isInputElement(this.#element, {types: ['button', 'submit', 'reset', 'image']});
  }
  get #implicitRole(): boolean {
    return this.#isNativeButton || this.#isValidLink || this.#isButtonInput;
  }

  constructor() {
    this.role.pipe(({next}) => next() ?? (this.#implicitRole ? null : 'button'));
    this.type.pipe(({next}) => next() ?? (this.#isNativeButton ? 'button' : null));

    this.#onKeyDown.pipe(({event, stop, next, stopped}) => {
      if (this.hardDisabled()) {
        stop();
        return;
      }

      next();
      if (stopped() || this.softDisabled()) {
        return;
      }

      const isCurrentTarget = event.target === event.currentTarget;
      const currentTarget = event.currentTarget as HTMLElement;
      const isButton = isButtonElement(currentTarget);
      const isLink = !this.#isNativeButton && isAnchorElement(currentTarget, {validLink: true});
      const shouldClick = isCurrentTarget && (this.#isNativeButton ? isButton : !isLink);
      const isEnterKey = event.key === 'Enter';
      const isSpaceKey = event.key === ' ';

      if (shouldClick) {
        if (!this.#isNativeButton && (isSpaceKey || isEnterKey)) {
          event.preventDefault();
        }

        if (!this.#isNativeButton && isEnterKey) {
          this.#element.click();
        }
      }
    });

    this.#onKeyUp.pipe(({event, stop, stopped, next}) => {
      if (this.hardDisabled()) {
        stop();
        return;
      }

      next();
      if (stopped() || this.softDisabled()) {
        return;
      }

      if (event.target === event.currentTarget && !this.#isNativeButton && event.key === ' ') {
        this.#element.click();
      }
    });
  }
}
