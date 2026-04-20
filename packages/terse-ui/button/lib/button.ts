import {Directive, HOST_TAG_NAME, inject} from '@angular/core';
import {Focusable, hostEvent, Hoverable} from '@terse-ui/core';
import {injectElement, isButtonElement, isInputElement, isValidLink} from '@terse-ui/utils';

/**
 * Button behavior: keyboard activation, role/type auto-assignment, and disabled-state handling.
 *
 * Not used directly in templates — compose via `hostDirectives` to build
 * higher-level primitives (menu items, toolbar buttons, toggles).
 *
 * Handles:
 * - Keyboard activation: Enter on keydown, Space on keyup (non-native elements)
 * - Native `<button>` detection — defers to browser for Enter/Space handling
 * - Role/type auto-assignment for non-native elements
 */
@Directive({
  hostDirectives: [Focusable, Hoverable],
})
export class Button {
  readonly #element = injectElement();
  readonly #isNativeButton = inject(HOST_TAG_NAME) === 'button';

  readonly focusable = inject(Focusable);
  readonly hoverable = inject(Hoverable);

  // These must be used in a getter because attributes can change dynamically.
  get #isValidLink(): boolean {
    return isValidLink(this.#element);
  }
  get #isButtonInput(): boolean {
    return isInputElement(this.#element, {types: ['button', 'submit', 'reset', 'image']});
  }
  get #implicitRole(): boolean {
    return this.#isNativeButton || this.#isValidLink || this.#isButtonInput;
  }

  constructor() {
    this.focusable.base.role.intercept(
      ({next}) => next() ?? (this.#implicitRole ? null : 'button'),
    );
    this.focusable.base.type.intercept(
      ({next}) => next() ?? (this.#isNativeButton ? 'button' : null),
    );

    hostEvent(
      'click',
      ({event, next}) => {
        if (this.focusable.base.disabled()) {
          event.preventDefault();
          return;
        }
        next();
      },
      {channel: 'FIFO'},
    );

    hostEvent(
      'mousedown',
      ({next}) => {
        if (!this.focusable.base.disabled()) {
          next();
        }
      },
      {channel: 'FIFO'},
    );

    hostEvent(
      'pointerdown',
      ({next, event}) => {
        if (this.focusable.base.disabled()) {
          event.preventDefault();
          return;
        }
        next();
      },
      {channel: 'FIFO'},
    );

    hostEvent(
      'keydown',
      ({event, next}) => {
        if (this.focusable.base.hardDisabled()) {
          return;
        }

        const isEnterKey = event.key === 'Enter';
        const isSpaceKey = event.key === ' ';

        if (this.focusable.base.softDisabled() && (isSpaceKey || isEnterKey)) {
          event.preventDefault();
          return;
        }

        const isCurrentTarget = event.target === event.currentTarget;
        const currentTarget = event.currentTarget as HTMLElement;
        const isButton = isButtonElement(currentTarget);
        const isLink = !this.#isNativeButton && isValidLink(currentTarget);
        const shouldClick = isCurrentTarget && (this.#isNativeButton ? isButton : !isLink);

        if (shouldClick) {
          if (!this.#isNativeButton && (isSpaceKey || isEnterKey)) {
            event.preventDefault();
          }

          if (!this.#isNativeButton && isEnterKey) {
            this.#element.click();
          }
        }

        next();
      },
      {channel: 'FIFO'},
    );

    hostEvent(
      'keyup',
      ({event, next}) => {
        if (this.focusable.base.hardDisabled()) {
          event.preventDefault();
          return;
        }

        if (this.focusable.base.softDisabled() && event.key === ' ') {
          event.preventDefault();
          return;
        }

        if (
          !this.focusable.base.disabled() &&
          !this.#isNativeButton &&
          event.target === event.currentTarget &&
          event.key === ' '
        ) {
          this.#element.click();
        }

        next();
      },
      {channel: 'FIFO'},
    );
  }
}
