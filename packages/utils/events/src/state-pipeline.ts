import {
  computed,
  isSignal,
  linkedSignal,
  signal,
  type CreateComputedOptions,
  type Injector,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {setupContext} from '@terse-ui/utils';
import {deepComputed, type DeepSignal} from '@terse-ui/utils/signals';

/**
 * Context passed to every {@link StatePipelineHandler}.
 *
 * A handler can produce its output by:
 * - returning a value directly (which short-circuits the rest of the chain without halting it),
 * - calling {@link next} to delegate to the handler registered before it, or
 * - calling {@link halt} to stop the chain entirely.
 */
export interface StatePipelineContext<T> {
  /** Value handed to this handler by the outer (more recently intercepted) layer, or the source state for the outermost handler. */
  get incoming(): T;
  /**
   * Delegate to the next handler inward (the one registered *before* this one).
   * Pass a value to transform `incoming` on the way, or omit to forward it unchanged.
   * Returns whatever the remaining chain produces.
   */
  next(value?: T): T;
  /** `true` once any handler in this execution has called {@link halt}. */
  halted(): boolean;
  /** Stop the chain. Handlers not yet invoked are skipped; this handler's return value flows into `finalize`. */
  halt(): void;
}

/** A single transform step in a {@link StatePipeline}. */
export type StatePipelineHandler<T> = (ctx: StatePipelineContext<T>) => T;

/** Options accepted when creating a {@link StatePipeline}. */
export interface StatePipelineOptions<T> extends CreateComputedOptions<T> {
  /**
   * Runs after the handler chain on every emission. Use this for invariants the
   * primitive must guarantee regardless of what consumers intercept on top — e.g.
   * clamping `tabindex` to `-1` when the host is hard-disabled.
   */
  readonly finalize?: (value: T) => T;
  /**
   * A handler installed at construction. Because the chain runs LIFO, this
   * handler runs **last** (innermost) and serves as the primitive's default
   * transform, reachable by outer handlers via `next()`.
   */
  readonly defaultHandler?: StatePipelineHandler<T>;
}

/** Options accepted by {@link StatePipeline.intercept}. */
export interface StatePipelineInterceptOptions {
  /** Injector used to resolve the `DestroyRef` for auto-cleanup. Defaults to the current injection context. */
  readonly injector?: Injector;
}

interface Methods<T> {
  /**
   * Register a handler. Because execution is LIFO, the most recently intercepted
   * handler runs **first** — outer composers naturally get first crack at the
   * value, with earlier-registered (inner) handlers reached via `next()`.
   *
   * Auto-removes when the calling injection context is destroyed. The returned
   * function removes the handler early if needed.
   */
  intercept(handler: StatePipelineHandler<T>, opts?: StatePipelineInterceptOptions): () => void;
  /**
   * Shorthand for `intercept(({next}) => next(value))`. Registers a handler that
   * ignores its `incoming` and delegates inward with `value`, so every inner
   * handler sees `value` as their starting state. Unlike {@link set}, this
   * doesn't mutate the source signal — it layers an override onto the chain,
   * and inner handlers / `finalize` may still transform the value before emission.
   */
  interceptWith(value: T): void;
  /** Replace the source signal's value. Flows through the full handler chain on next read. */
  set(value: T): void;
  /** Update the source signal's value from its previous value. */
  update(updater: (value: T) => T): void;
}

/**
 * A read-only signal backed by an ordered handler chain. Consumers extend it
 * via `.intercept(...)`, override the source via `.set(...)` / `.update(...)`,
 * or strip the mutator surface via `.asReadonly()`.
 */
export interface StatePipeline<T> extends Signal<T>, Methods<T> {
  asReadonly(): Signal<T>;
}

/** Deep-signal variant of {@link StatePipeline}. See {@link StatePipelineFunction.deep}. */
export type PipelineDeepSignal<T extends object> = DeepSignal<T> &
  Methods<T> & {asReadonly(): DeepSignal<T>};

export interface StatePipelineFunction {
  /**
   * Create a {@link StatePipeline} around a static value or an existing signal.
   * When given a signal, the pipeline tracks it via `linkedSignal`, so upstream
   * changes flow through the handler chain automatically.
   */
  <T>(source: T | Signal<T>, opts?: StatePipelineOptions<T>): StatePipeline<T>;
  /**
   * Deep-signal variant: the result is a {@link DeepSignal} that can be read
   * field-by-field while still participating in the handler chain.
   */
  deep<T extends object>(
    source: T | Signal<T>,
    opts?: StatePipelineOptions<T>,
  ): PipelineDeepSignal<T>;
}

function createPipeline<T>(
  source: T | Signal<T>,
  opts?: StatePipelineOptions<T>,
): {
  result: Signal<T>;
  intercept: Methods<T>['intercept'];
  interceptWith: Methods<T>['interceptWith'];
  set: Methods<T>['set'];
  update: Methods<T>['update'];
} {
  const link = isSignal(source) ? linkedSignal(source) : signal(source);
  const finalize = opts?.finalize ?? ((value: T) => value);
  const handlers = signal<StatePipelineHandler<T>[]>(
    opts?.defaultHandler ? [opts.defaultHandler] : [],
  );
  const result = computed(() => finalize(executePipeline(handlers(), link())), opts);
  const methods: Methods<T> = {
    intercept: (handler, interceptOpts) =>
      useIntercept(methods.intercept, handler, handlers, interceptOpts),
    interceptWith: (value) => methods.intercept(({next}) => next(value)),
    set: (value) => link.set(value),
    update: (updater) => link.update(updater),
  };
  return {result, ...methods};
}

/**
 * Run handlers in reverse registration order (last intercepted runs first).
 * Outer composers register after inner primitives (hostDirectives construct
 * innermost-first), so LIFO gives the outermost specialization first crack at
 * the value and treats the inner primitive as the default reachable via
 * `next()`. `halt()` stops delegation; falls back to `state` when no handlers
 * remain.
 */
function executePipeline<T>(handlers: StatePipelineHandler<T>[], state: T): T {
  let halted = false;

  const execute = (index: number, incoming: T): T => {
    if (halted || index < 0) return incoming;
    return (handlers[index] as StatePipelineHandler<T>)({
      get incoming() {
        return incoming;
      },
      next: (value?: T) => execute(index - 1, value === undefined ? incoming : value),
      halted: () => halted,
      halt() {
        halted = true;
      },
    });
  };

  return execute(handlers.length - 1, state);
}

function useIntercept<T>(
  functionName: (...args: never[]) => unknown,
  handler: StatePipelineHandler<T>,
  handlers: WritableSignal<StatePipelineHandler<T>[]>,
  opts?: StatePipelineInterceptOptions,
): () => void {
  const {runInContext} = setupContext(opts?.injector, functionName);
  return runInContext(({onCleanup}) => {
    handlers.update((h) => [...h, handler]);
    const remove = () => handlers.update((ha) => ha.filter((h) => h !== handler));
    onCleanup(remove);
    return remove;
  });
}

/**
 * A signal whose value is computed by running a chain of handlers against a
 * source, in **LIFO registration order** (the last handler intercepted runs
 * first). Use it to expose extension points on primitives: the primitive
 * installs its default transform via `defaultHandler` or its own `intercept(...)`
 * call, and outer composing directives `intercept(...)` handlers that run
 * before it.
 *
 * ## Why LIFO
 *
 * In Angular's `hostDirectives`, inner primitives construct before outer
 * composers — so by the time an outer composer intercepts, the primitive's
 * handler is already registered. LIFO means the outer composer (the
 * specialization) runs first and reaches the primitive's behavior via `next()`
 * as the default.
 *
 * ## Enforcing invariants
 *
 * Any consumer can halt the chain or decline to call `next()`. When the
 * primitive *must* enforce a rule regardless of what's intercepted on top, use
 * `finalize` — it runs after the chain on every emission and cannot be bypassed.
 *
 * @example
 * ```ts
 * // Primitive: exposes `tabIndex` with a hard-disabled invariant.
 * class Focusable {
 *   readonly _inputTabIndex = input<number | null>(null);
 *   readonly tabIndex = statePipeline(this._inputTabIndex, {
 *     finalize: (v) => (this.hardDisabled() ? -1 : v ?? 0),
 *   });
 * }
 *
 * // Outer composer: intercepts before the primitive's default.
 * class RovingFocusItem {
 *   readonly #focusable = inject(Focusable);
 *   constructor() {
 *     this.#focusable.tabIndex.intercept(({next}) =>
 *       this.isActive() ? next() : -1,
 *     );
 *   }
 * }
 * ```
 */
export const statePipeline: StatePipelineFunction = Object.assign(
  function <T>(source: T | Signal<T>, opts?: StatePipelineOptions<T>): StatePipeline<T> {
    const {result, intercept, interceptWith, set, update} = createPipeline(source, opts);
    const readOnly = computed(() => result());
    return Object.assign(result, {
      intercept,
      interceptWith,
      set,
      update,
      asReadonly: () => readOnly,
    });
  },
  {
    deep<T extends object>(
      source: T | Signal<T>,
      opts?: StatePipelineOptions<T>,
    ): PipelineDeepSignal<T> {
      const {result, intercept, interceptWith, set, update} = createPipeline(source, opts);
      const readOnly = deepComputed(result);
      return Object.assign(deepComputed(result), {
        intercept,
        interceptWith,
        set,
        update,
        asReadonly: () => readOnly,
      });
    },
  },
);
