import {
  computed,
  type CreateComputedOptions,
  type Injector,
  isSignal,
  linkedSignal,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {setupContext} from '@signality/core/internal';

// ============================================================================
// Public API
// ============================================================================

/**
 * Context provided to each pipeline handler during execution.
 *
 * @example
 * ```ts
 * pipeline.use(({source, next}) => {
 *   if (someCondition()) return -1;  // short-circuit
 *   return next();                    // delegate downstream
 * });
 * ```
 */
export interface PipelineContext<T> {
  /**
   * The raw source value before any handlers.
   * Use this to bypass the entire chain and return the original value.
   */
  readonly source: T;

  /**
   * Delegate to the next handler in the chain.
   * If no handlers remain, returns the source value.
   *
   * @param value - Optional override value to pass downstream.
   *   When provided, downstream handlers see this as their `source`.
   *   When omitted, the original source value flows through.
   */
  next(value?: T): T;
}

/**
 * A function that intercepts a pipeline's value.
 * Handlers execute in stack order (last registered runs first).
 *
 * @returns The value this handler produces. Can be:
 * - A new value (short-circuit)
 * - The result of `ctx.next()` (delegate)
 * - A transformation of `ctx.next()` (wrap)
 */
export type PipelineHandler<T> = (ctx: PipelineContext<T>) => T;

/** Options for registering a pipeline handler. */
export interface PipelineUseOptions {
  /**
   * Explicit injector for cleanup registration.
   * When omitted, uses the current injection context.
   */
  injector?: Injector;

  /**
   * Controls where the handler is inserted in the chain.
   *
   * - `'prepend'` — Runs **after** all existing handlers (closest to source).
   *   Use when you want to provide a base value that others can override.
   *
   * - `'append'` (default) — Runs **before** all existing handlers (outermost).
   *   Use when you want final say over the value.
   *
   * In stack-order execution: append = outermost = runs first.
   */
  position?: 'append' | 'prepend';
}

export interface ValuePipeline<T> extends Signal<T> {
  (): T;
}

/**
 * A reactive middleware pipeline for Angular signals.
 *
 * Combines the Chain of Responsibility pattern with Angular's signal
 * reactivity. Handlers can intercept, transform, delegate, or
 * short-circuit the value flowing from source to result.
 *
 * Execution model:
 * - Handlers execute in **stack order** (last registered = outermost = runs first)
 * - Each handler can call `next()` to delegate to the next handler
 * - The innermost fallback returns the source signal's value
 * - The entire chain re-evaluates when any signal read by any handler changes
 *
 * @example
 * ```ts
 * // In a directive
 * class TabIndex extends Pipeline<number> {
 *   readonly tabIndex = input(0, {transform: numberAttribute});
 *   constructor() {
 *     super(computed(() => this.tabIndex()));
 *   }
 * }
 *
 * // In a composing directive
 * class Disabled {
 *   constructor() {
 *     inject(TabIndex).use(({next, source}) => {
 *       if (this.disabled()) return -1;
 *       return next();
 *     });
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class ValuePipeline<T> extends Function {
  declare private readonly _handlers: WritableSignal<PipelineHandler<T>[]>;
  declare private readonly _state: WritableSignal<T>;
  declare private readonly _result: Signal<T>;

  constructor(input: Signal<T> | T, options?: CreateComputedOptions<T>) {
    super();
    const state = isSignal(input) ? linkedSignal(input) : signal(input);
    const handlers = signal([] as PipelineHandler<T>[]);
    const result = computed(() => executeChain(handlers(), state()), options);
    Object.setPrototypeOf(result, new.target.prototype);
    Object.getOwnPropertyNames(result).forEach((p) => {
      const descriptor = Object.getOwnPropertyDescriptor(result, p);
      if (descriptor) Object.defineProperty(result, p, descriptor);
    });
    Object.defineProperty(result, '_state', {value: state});
    Object.defineProperty(result, '_result', {value: result});
    Object.defineProperty(result, '_handlers', {value: handlers});
    return result as unknown as Signal<T> & this;
  }

  /**
   * Override the source value programmatically.
   * This bypasses any input signal the pipeline was constructed with.
   */
  protected set(value: T): void {
    this._state.set(value);
  }

  /**
   * Register a handler that intercepts the pipeline's value.
   *
   * Handlers are automatically removed when the injection context
   * is destroyed (e.g., when the directive/component is destroyed).
   *
   * @returns A function to manually remove the handler.
   *
   * @example
   * ```ts
   * // Short-circuit: override the value
   * pipeline.use(() => -1);
   *
   * // Delegate: let downstream handlers decide
   * pipeline.use(({next}) => next());
   *
   * // Wrap: transform the downstream value
   * pipeline.use(({next}) => Math.min(-1, next()));
   *
   * // Conditional: sometimes override, sometimes delegate
   * pipeline.use(({next, source}) => {
   *   if (this.disabled()) return -1;
   *   return next();
   * });
   * ```
   */
  use(handler: PipelineHandler<T>, options?: PipelineUseOptions): () => void;
  use(handler: PipelineHandler<T>, injector?: Injector): () => void;
  use(handler: PipelineHandler<T>, optionsOrInjector?: PipelineUseOptions | Injector): () => void {
    const opts = resolveUseOptions(optionsOrInjector);
    const {runInContext} = setupContext(opts.injector, this.use.bind(this));

    return runInContext(({onCleanup}) => {
      const position = opts.position ?? 'append';
      this._handlers.update((h) => (position === 'prepend' ? [handler, ...h] : [...h, handler]));

      const remove = () => {
        this._handlers.update((h) => {
          const idx = h.indexOf(handler);
          if (idx === -1) return h;
          const copy = h.slice();
          copy.splice(idx, 1);
          return copy;
        });
      };

      onCleanup(remove);
      return remove;
    });
  }
}

// ============================================================================
// Internal
// ============================================================================

/**
 * Execute the handler chain in stack order (last handler runs first).
 *
 * Each handler receives a `next()` function that, when called,
 * executes the next handler in the chain. If `next()` is called
 * with a value, that value replaces the source for downstream handlers.
 * The innermost fallback returns the (possibly overridden) source value.
 */
function executeChain<T>(handlers: PipelineHandler<T>[], sourceValue: T): T {
  const execute = (index: number, currentSource: T): T =>
    handlers[index]?.({
      source: sourceValue,
      next: (override?: T) => execute(index - 1, override !== undefined ? override : currentSource),
    }) ?? currentSource;
  return execute(handlers.length - 1, sourceValue);
}

function resolveUseOptions(input?: PipelineUseOptions | Injector): PipelineUseOptions {
  if (!input) return {};
  // Injector instances have a `get` method; PipelineUseOptions don't.
  if (typeof (input as Injector).get === 'function') {
    return {injector: input as Injector};
  }
  return input as PipelineUseOptions;
}
