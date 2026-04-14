import {computed, Directive, inject, input} from '@angular/core';
import {listener} from '@signality/core';
import {AriaDisabled, DataDisabled, DisabledAttribute, TabIndex} from '@terse-ui/core/attributes';
import {OnClick, OnKeyDown, OnMouseDown, OnPointerDown} from '@terse-ui/core/events';
import {pipelineSignal} from '@terse-ui/core/state';
import {configBuilder, hasDisabledAttribute, injectElement, isBoolean} from '@terse-ui/core/utils';

/**
 * Controls which capture-phase events are suppressed when the button is disabled.
 *
 * By default, all three are `true` — disabled buttons silently swallow clicks,
 * mousedowns, and pointerdowns so they never reach application handlers.
 * Set individual flags to `false` if you need a disabled button to still
 * propagate specific events (e.g. for analytics or tooltip triggers).
 */
export interface DisablerOptions {
  captureClick: boolean;
  captureMouseDown: boolean;
  capturePointerDown: boolean;
}

const [provideDisablerOptions, injectDisablerOptions] = configBuilder<DisablerOptions>(
  'DisablerOptions',
  {
    captureClick: true,
    captureMouseDown: true,
    capturePointerDown: true,
  },
);

export {provideDisablerOptions};

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
  exportAs: 'disabler',
  hostDirectives: [
    TabIndex,
    DisabledAttribute,
    DataDisabled,
    AriaDisabled,
    OnKeyDown,
    OnClick,
    OnMouseDown,
    OnPointerDown,
  ],
})
export class Disabler {
  readonly #options = injectDisablerOptions();
  readonly #element = injectElement();
  readonly #hasDisabledAttribute = hasDisabledAttribute(this.#element);

  readonly host = {
    tabIndex: inject(TabIndex).value,
    disabled: inject(DisabledAttribute).value,
    ariaDisabled: inject(AriaDisabled).value,
    dataDisabled: inject(DataDisabled).value,
    onKeyDown: inject(OnKeyDown),
    onClick: inject(OnClick),
    onMouseDown: inject(OnMouseDown),
    onPointerDown: inject(OnPointerDown),
  } as const;

  /**
   * Controls the disabled state of the button.
   *
   * - `true` or `''` or `'hard'` — **hard disabled**: non-focusable, non-interactive.
   *   Native `<button>` gets the `disabled` attribute; non-native elements get
   *   `aria-disabled="true"` and `tabindex="-1"`.
   * - `'soft'` — **soft disabled**: focusable but non-interactive. Useful for
   *   loading states or menu items that need to remain in the tab order.
   *   Gets `aria-disabled="true"` but keeps `tabindex="0"`.
   * - `false` or omitted — enabled.
   *
   * @default false
   *
   * @example
   * ```html
   * <button terseButton disabled>Hard disabled</button>
   * <button terseButton disabled="soft">Soft disabled</button>
   * <button terseButton [disabled]="isLoading ? 'soft' : false">Submit</button>
   * ```
   */
  readonly _disabledInput = input(false, {
    alias: 'disabled',
    transform: (v: boolean | '' | 'hard' | 'soft' | null | undefined): boolean | 'soft' => {
      if (isBoolean(v)) return v;
      if (v === 'soft') return 'soft';
      if (v === '' || v === 'hard') return true;
      return false;
    },
  });

  readonly disabled = pipelineSignal(this._disabledInput);

  readonly variant = computed(() =>
    this.disabled() === 'soft' ? 'soft' : this.disabled() === true ? 'hard' : null,
  );

  readonly soft = computed(() => this.variant() === 'soft');

  readonly hard = computed(() => this.variant() === 'hard');

  /**
   * Override capture-phase event suppression on a per-instance basis.
   *
   * Partial — only the flags you provide are overridden; the rest come
   * from the nearest {@link provideDisablerConfig} or the built-in defaults.
   *
   * @default { captureClick: true, captureMouseDown: true, capturePointerDown: true }
   *
   * @example
   * ```html
   * <!-- Allow pointerdown through even when disabled (e.g. for tooltips) -->
   * <button terseButton [options]="{ capturePointerDown: false }">Info</button>
   * ```
   */
  readonly _optionsInput = input<DisablerOptions, Partial<DisablerOptions>>(this.#options, {
    alias: 'disablerOptions',
    transform: (v) => ({...this.#options, ...v}),
  });

  readonly options = pipelineSignal.deep(this._optionsInput);

  constructor() {
    this.host.tabIndex.pipe(({next}) => {
      let tabIndex = next();
      if (!this.#hasDisabledAttribute && this.disabled()) {
        tabIndex = this.soft() ? tabIndex : -1;
      }
      return tabIndex ?? 0;
    });

    if (this.#hasDisabledAttribute) {
      this.host.disabled.pipe(({next}) => (this.hard() ? true : next()));
    }

    this.host.ariaDisabled.pipe(({next}) => {
      let ariaDisabled = next();
      if (
        (this.#hasDisabledAttribute && this.soft()) ||
        (!this.#hasDisabledAttribute && this.disabled())
      ) {
        ariaDisabled = Boolean(this.disabled());
      }
      return ariaDisabled;
    });

    this.host.dataDisabled.pipe(({next}) => {
      let dataDisabled = next();
      const value = this.variant();
      if (value) {
        dataDisabled = value;
      }
      return dataDisabled;
    });

    listener.capture(this.#element, 'click', (event) => {
      if (this.options.captureClick() && this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    listener.capture(this.#element, 'mousedown', (event) => {
      if (this.options.captureMouseDown() && this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    listener.capture(this.#element, 'pointerdown', (event) => {
      if (this.options.capturePointerDown() && this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    // Pipeline-level suppression — composing directives can check `stopped()`
    // after `next()` to detect disabled state. Also serves as fallback when
    // capture-phase suppression is disabled via options.

    this.host.onClick.pipe(({stop, next, preventDefault}) => {
      if (this.disabled()) {
        preventDefault();
        stop();
        return;
      }
      next();
    });

    this.host.onMouseDown.pipe(({stop, next}) => {
      if (this.disabled()) {
        stop();
        return;
      }
      next();
    });

    this.host.onPointerDown.pipe(({stop, next, preventDefault}) => {
      if (this.disabled()) {
        preventDefault();
        stop();
        return;
      }
      next();
    });

    this.host.onKeyDown.pipe(({event, next}) => {
      if (this.soft() && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
      }
      next();
    });
  }
}
