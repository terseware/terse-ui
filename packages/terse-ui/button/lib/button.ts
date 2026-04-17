import {booleanAttribute, Directive, HOST_TAG_NAME, inject, input} from '@angular/core';
import {listener} from '@signality/core';
import {Focusable, Hoverable, Identity} from '@terse-ui/core';
import {OnClick, OnKeyDown, OnKeyUp, OnMouseDown, OnPointerDown} from '@terse-ui/core/events';
import {
  injectElement,
  isAnchorElement,
  isButtonElement,
  isInputElement,
  statePipeline,
} from '@terse-ui/core/utils';

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
  hostDirectives: [
    Focusable,
    Hoverable,
    Identity,
    OnClick,
    OnMouseDown,
    OnPointerDown,
    OnKeyDown,
    OnKeyUp,
  ],
})
export class Button {
  readonly focusable = inject(Focusable);
  readonly hoverable = inject(Hoverable);
  readonly identity = inject(Identity);
  readonly #onClick = inject(OnClick);
  readonly #onMouseDown = inject(OnMouseDown);
  readonly #onPointerDown = inject(OnPointerDown);
  readonly #onKeyDown = inject(OnKeyDown);
  readonly #onKeyUp = inject(OnKeyUp);

  readonly #element = injectElement();
  readonly #isNativeButton = inject(HOST_TAG_NAME) === 'button';

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

  readonly _inputCaptureClick = input(true, {
    alias: 'captureClick',
    transform: booleanAttribute,
  });
  readonly captureClick = statePipeline(this._inputCaptureClick);

  readonly _inputCaptureMouseDown = input(true, {
    alias: 'captureMouseDown',
    transform: booleanAttribute,
  });
  readonly captureMouseDown = statePipeline(this._inputCaptureMouseDown);

  readonly _inputCapturePointerDown = input(true, {
    alias: 'capturePointerDown',
    transform: booleanAttribute,
  });
  readonly capturePointerDown = statePipeline(this._inputCapturePointerDown);

  constructor() {
    this.identity.role.intercept(({next}) => next() ?? (this.#implicitRole ? null : 'button'));
    this.identity.type.intercept(({next}) => next() ?? (this.#isNativeButton ? 'button' : null));

    listener.capture(this.#element, 'click', (event) => {
      if (this.captureClick() && this.focusable.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
    this.#onClick.intercept(({haltPipeline, next, preventDefault}) => {
      if (this.focusable.disabled()) {
        preventDefault();
        haltPipeline();
        return;
      }
      next();
    });

    listener.capture(this.#element, 'mousedown', (event) => {
      if (this.captureMouseDown() && this.focusable.disabled()) {
        event.stopImmediatePropagation();
      }
    });
    this.#onMouseDown.intercept(({haltPipeline, next}) => {
      if (this.focusable.disabled()) {
        haltPipeline();
        return;
      }
      next();
    });

    listener.capture(this.#element, 'pointerdown', (event) => {
      if (this.capturePointerDown() && this.focusable.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
    this.#onPointerDown.intercept(({haltPipeline, next, preventDefault}) => {
      if (this.focusable.disabled()) {
        preventDefault();
        haltPipeline();
        return;
      }
      next();
    });

    this.#onKeyDown.intercept(({event, next, haltPipeline, pipelineHalted, preventDefault}) => {
      if (this.focusable.hardDisabled()) {
        haltPipeline();
        return;
      }

      next();
      if (pipelineHalted() || this.focusable.softDisabled()) {
        return;
      }

      const isCurrentTarget = event.target === event.currentTarget;
      const currentTarget = event.currentTarget as HTMLElement;
      const isButton = isButtonElement(currentTarget);
      const isLink = !this.#isNativeButton && isAnchorElement(currentTarget, {validLink: true});
      const shouldClick = isCurrentTarget && (this.#isNativeButton ? isButton : !isLink);
      const isEnterKey = event.key === 'Enter';
      const isSpaceKey = event.key === ' ';
      const role = currentTarget.getAttribute('role');
      const isTextNavigationRole =
        role?.startsWith('menuitem') || role === 'option' || role === 'gridcell';

      if (isCurrentTarget && this.focusable.composite() && isSpaceKey) {
        if (event.defaultPrevented && isTextNavigationRole) {
          return;
        }

        event.preventDefault();

        if (isLink || (this.#isNativeButton && isButton)) {
          currentTarget.click();
          haltPipeline();
        } else if (shouldClick) {
          this.#element.click();
          haltPipeline();
        }

        return;
      }

      if (shouldClick) {
        if (!this.#isNativeButton && (isSpaceKey || isEnterKey)) {
          preventDefault();
        }

        if (!this.#isNativeButton && isEnterKey) {
          this.#element.click();
        }
      }
    });

    this.#onKeyUp.intercept(({event, haltPipeline, pipelineHalted, next}) => {
      if (this.focusable.hardDisabled()) {
        haltPipeline();
        return;
      }

      next();

      if (
        event.target === event.currentTarget &&
        this.#isNativeButton &&
        this.focusable.composite() &&
        isButtonElement(event.currentTarget as HTMLElement) &&
        event.key === ' '
      ) {
        event.preventDefault();
        return;
      }

      if (pipelineHalted() || this.focusable.softDisabled()) {
        return;
      }

      if (
        event.target === event.currentTarget &&
        !this.#isNativeButton &&
        !this.focusable.composite() &&
        event.key === ' '
      ) {
        this.#element.click();
      }
    });
  }
}
