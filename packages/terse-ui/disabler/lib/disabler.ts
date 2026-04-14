import {Directive, inject, input, linkedSignal} from '@angular/core';
import {listener} from '@signality/core';
import {AriaDisabled, DataDisabled, DisabledAttribute, TabIndex} from '@terse-ui/core/attributes';
import {OnClick, OnKeyDown, OnKeyUp, OnMouseDown, OnPointerDown} from '@terse-ui/core/events';
import {StatePipeline} from '@terse-ui/core/state';
import {
  configBuilder,
  hasDisabledAttribute,
  injectElement,
  isBoolean,
  type DeepPartial,
} from '@terse-ui/core/utils';

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

const [provideDisablerConfig, injectDisablerConfig] = configBuilder<{options: DisablerOptions}>(
  'Button',
  {
    options: {
      captureClick: true,
      captureMouseDown: true,
      capturePointerDown: true,
    },
  },
);

export {provideDisablerConfig};

/** Inner state before the pipeline transform. */
interface DisablerInnerState extends DisablerOptions {
  disabled: boolean | 'soft';
}

/**
 * The computed public state of a button, exposed via `result`.
 *
 * This is the transformed output of the state pipeline — derived from
 * the raw `disabled` input and options. Use `result.disabled()`,
 * `result.softDisabled()`, etc. in composing directives.
 */
export interface DisablerState {
  /** True when disabled in any form (hard or soft). */
  disabled: boolean;
  /** True only when `disabled="soft"` — focusable but non-interactive. */
  softDisabled: boolean;
  /** `'hard'`, `'soft'`, or `null` — useful for `data-disabled` styling. */
  disabledVariant: 'soft' | 'hard' | null;
  /** Current capture-phase suppression options. */
  captureClick: boolean;
  /** Whether to suppress mouse down events when disabled. */
  captureMouseDown: boolean;
  /** Whether to suppress pointer down events when disabled. */
  capturePointerDown: boolean;
}

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
    OnKeyUp,
    OnClick,
    OnMouseDown,
    OnPointerDown,
  ],
})
export class Disabler extends StatePipeline<DisablerInnerState, DisablerState> {
  readonly #config = injectDisablerConfig();
  readonly #element = injectElement();
  readonly #hasDisabledAttribute = hasDisabledAttribute(this.#element);

  readonly host = {
    tabIndex: inject(TabIndex),
    disabled: inject(DisabledAttribute),
    ariaDisabled: inject(AriaDisabled),
    dataDisabled: inject(DataDisabled),
    onKeyDown: inject(OnKeyDown),
    onKeyUp: inject(OnKeyUp),
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
  readonly disabledInput = input(false, {
    alias: 'disabled',
    transform: (v: boolean | '' | 'hard' | 'soft' | null | undefined): boolean | 'soft' => {
      if (isBoolean(v)) return v;
      if (v === 'soft') return 'soft';
      if (v === '' || v === 'hard') return true;
      return false;
    },
  });

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
  readonly optionsInput = input<Partial<DisablerOptions>>(this.#config.options, {
    alias: 'disablerOptions',
  });

  /**
   * Programmatically disable the button.
   *
   * Overrides the template `[disabled]` binding until the next change
   * detection cycle resets it from the input. Use for imperative flows
   * like disabling during an async operation from a composing directive.
   *
   * @param value - `'hard'` (default) for fully disabled, `'soft'` for focusable disabled.
   */
  disable(value: 'hard' | 'soft' = 'hard'): void {
    this.patchState({disabled: value === 'soft' ? 'soft' : true});
  }

  /**
   * Programmatically enable the button.
   *
   * Counterpart to {@link disable}. Same override caveat applies.
   */
  enable(): void {
    this.patchState({disabled: false});
  }

  /**
   * Programmatically patch the button options.
   *
   * Merges the provided partial into the current options state.
   * Useful for composing directives that need to toggle specific
   * capture-phase flags at runtime.
   */
  patchOptions(options: DeepPartial<DisablerOptions>): void {
    this.updateState((s) => ({
      ...s,
      captureClick: options.captureClick ?? s.captureClick,
      captureMouseDown: options.captureMouseDown ?? s.captureMouseDown,
      capturePointerDown: options.capturePointerDown ?? s.capturePointerDown,
    }));
  }

  constructor() {
    super(
      linkedSignal(() => ({
        ...this.#config.options,
        ...this.optionsInput(),
        disabled: this.disabledInput(),
      })),
      {
        transform: (s) => ({
          disabled: !!s.disabled,
          softDisabled: s.disabled === 'soft',
          disabledVariant: s.disabled === 'soft' ? 'soft' : s.disabled ? 'hard' : null,
          captureClick: s.captureClick,
          captureMouseDown: s.captureMouseDown,
          capturePointerDown: s.capturePointerDown,
        }),
      },
    );

    this.host.tabIndex.append(({next}) => {
      let tabIndex = next();
      if (!this.#hasDisabledAttribute && this.state.disabled()) {
        tabIndex = this.state.softDisabled() ? tabIndex : -1;
      }
      return tabIndex ?? 0;
    });

    if (this.#hasDisabledAttribute) {
      this.host.disabled.append(() => this.state.disabled() && !this.state.softDisabled());
    }

    this.host.ariaDisabled.append(({next}) => {
      let ariaDisabled = next();
      if (
        (this.#hasDisabledAttribute && this.state.softDisabled()) ||
        (!this.#hasDisabledAttribute && this.state.disabled())
      ) {
        ariaDisabled = Boolean(this.state.disabled());
      }
      return ariaDisabled;
    });

    this.host.dataDisabled.append(({next}) => {
      let dataDisabled = next();
      const value = this.state.disabledVariant();
      if (value) {
        dataDisabled = value;
      }
      return dataDisabled;
    });

    listener.capture(this.#element, 'click', (event) => {
      if (this.state.captureClick() && this.state.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    listener.capture(this.#element, 'mousedown', (event) => {
      if (this.state.captureMouseDown() && this.state.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    listener.capture(this.#element, 'pointerdown', (event) => {
      if (this.state.capturePointerDown() && this.state.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    // Pipeline-level suppression — composing directives can check `stopped()`
    // after `next()` to detect disabled state. Also serves as fallback when
    // capture-phase suppression is disabled via options.
    this.host.onClick.append(({stop, next}) => {
      if (this.state.disabled()) {
        stop();
        return;
      }
      next();
    });

    this.host.onMouseDown.append(({stop, next}) => {
      if (this.state.disabled()) {
        stop();
        return;
      }
      next();
    });

    this.host.onPointerDown.append(({stop, next}) => {
      if (this.state.disabled()) {
        stop();
        return;
      }
      next();
    });

    this.host.onKeyDown.append(({event, next}) => {
      if (this.state.softDisabled() && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
      }
      next();
    });
  }
}
