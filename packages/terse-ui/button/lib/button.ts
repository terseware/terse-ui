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
 * Button behavior: keyboard activation and role/type auto-assignment.
 *
 * Not used directly in templates — compose via `hostDirectives` to build
 * higher-level primitives (menu items, toolbar buttons, toggles).
 *
 * Disabled-state handling lives in {@link Disabler}; Button only consults
 * Disabler to skip activation when disabled. Composition via `terseButton`
 * pulls in both directives.
 *
 * Handles:
 * - Keyboard activation: Enter on keydown, Space on keyup (non-native elements)
 * - Native `<button>` detection — defers to browser for Enter/Space handling
 * - Role/type auto-assignment for non-native elements
 */
@Directive({
  hostDirectives: [Disabler, RoleAttribute, TypeAttribute, OnKeyDown, OnKeyUp],
})
export class Button {
  readonly #element = injectElement();
  readonly #isNativeButton = inject(HOST_TAG_NAME) === 'button';

  readonly #disabler = inject(Disabler);
  readonly disabled = this.#disabler.disabled;
  readonly softDisabled = this.#disabler.soft;
  readonly hardDisabled = this.#disabler.hard;

  readonly #role = inject(RoleAttribute).value;
  readonly #type = inject(TypeAttribute).value;
  readonly role = this.#role.asReadonly();
  readonly type = this.#type.asReadonly();

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
    this.#role.pipe(({next}) => next() ?? (this.#implicitRole ? null : 'button'));
    this.#type.pipe(({next}) => next() ?? (this.#isNativeButton ? 'button' : null));

    this.#onKeyDown.pipe(({event, next, pipelineHalted, preventDefault}) => {
      next();
      if (pipelineHalted() || this.softDisabled()) {
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
          preventDefault();
        }

        if (!this.#isNativeButton && isEnterKey) {
          this.#element.click();
        }
      }
    });

    this.#onKeyUp.pipe(({event, pipelineHalted, next}) => {
      next();
      if (pipelineHalted() || this.softDisabled()) {
        return;
      }

      if (event.target === event.currentTarget && !this.#isNativeButton && event.key === ' ') {
        this.#element.click();
      }
    });
  }
}
