import {computed, Directive, inject, input} from '@angular/core';
import {listener} from '@signality/core';
import {AriaDisabled, DataDisabled, DisabledAttribute, TabIndex} from '@terse-ui/core/attributes';
import {OnClick, OnKeyDown, OnKeyUp, OnMouseDown, OnPointerDown} from '@terse-ui/core/events';
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
 * Disabled-state behavior: ARIA + DOM attributes, tabindex, and event suppression.
 *
 * Not used directly in templates — compose via `hostDirectives`. Pairs with
 * {@link Button} to build full button primitives (see `TerseButton`).
 *
 * Handles:
 * - Tri-state disabled (`true` | `'soft'` | `false`) with correct `disabled`,
 *   `aria-disabled`, `data-disabled`, and `tabindex` semantics
 * - Capture-phase event suppression when disabled (blocks template bindings)
 * - Pipeline-level event suppression via OnClick/OnMouseDown/OnPointerDown
 *   (composable — outer handlers can detect disabled via `pipelineHalted()`)
 * - Soft-disabled keydown: prevents default on Enter/Space without halting
 *   the pipeline, leaving outer handlers free to react
 */
@Directive({
  hostDirectives: [
    AriaDisabled,
    DataDisabled,
    DisabledAttribute,
    OnClick,
    OnKeyDown,
    OnKeyUp,
    OnMouseDown,
    OnPointerDown,
    TabIndex,
  ],
})
export class Disabler {
  readonly #options = injectDisablerOptions();
  readonly #element = injectElement();
  readonly #hasDisabledAttribute = hasDisabledAttribute(this.#element);

  readonly #ariaDisabled = inject(AriaDisabled).value;
  readonly #dataDisabled = inject(DataDisabled).value;
  readonly #disabled = inject(DisabledAttribute).value;
  readonly #onClick = inject(OnClick);
  readonly #onKeyDown = inject(OnKeyDown);
  readonly #onKeyUp = inject(OnKeyUp);
  readonly #onMouseDown = inject(OnMouseDown);
  readonly #onPointerDown = inject(OnPointerDown);
  readonly #tabIndex = inject(TabIndex).value;

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
    this.#tabIndex.pipe(({next}) => {
      let tabIndex = next();
      if (!this.#hasDisabledAttribute && this.disabled()) {
        tabIndex = this.soft() ? tabIndex : -1;
      }
      return tabIndex ?? 0;
    });

    if (this.#hasDisabledAttribute) {
      this.#disabled.pipe(({next}) => {
        let disabled = next();
        if (this.hard()) {
          disabled = true;
        }
        return disabled;
      });
    }

    this.#ariaDisabled.pipe(({next}) => {
      let ariaDisabled = next();
      if (
        (this.#hasDisabledAttribute && this.soft()) ||
        (!this.#hasDisabledAttribute && this.disabled())
      ) {
        ariaDisabled = Boolean(this.disabled());
      }
      return ariaDisabled;
    });

    this.#dataDisabled.pipe(({next}) => {
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

    // Pipeline-level suppression — composing directives can check `pipelineHalted()`
    // after `next()` to detect disabled state. Also serves as fallback when
    // capture-phase suppression is disabled via options.

    this.#onClick.pipe(({haltPipeline, next, preventDefault}) => {
      if (this.disabled()) {
        preventDefault();
        haltPipeline();
        return;
      }
      next();
    });

    this.#onMouseDown.pipe(({haltPipeline, next}) => {
      if (this.disabled()) {
        haltPipeline();
        return;
      }
      next();
    });

    this.#onPointerDown.pipe(({haltPipeline, next, preventDefault}) => {
      if (this.disabled()) {
        preventDefault();
        haltPipeline();
        return;
      }
      next();
    });

    this.#onKeyDown.pipe(({event, next, haltPipeline, preventDefault}) => {
      if (this.hard()) {
        // Let Tab through so a programmatically-focused disabled element
        // can still be escaped; everything else gets inert treatment.
        if (event.key !== 'Tab') preventDefault();
        haltPipeline();
        return;
      }

      if (this.soft() && (event.key === 'Enter' || event.key === ' ')) {
        preventDefault();
      }

      next();
    });

    this.#onKeyUp.pipe(({event, next, haltPipeline, preventDefault}) => {
      if (this.hard()) {
        if (event.key !== 'Tab') preventDefault();
        haltPipeline();
        return;
      }
      next();
    });
  }
}
