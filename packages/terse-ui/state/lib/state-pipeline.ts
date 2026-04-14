import {signal, type Injector} from '@angular/core';
import {setupContext} from '@signality/core/internal';
import {isUndefined, type DeepReadonly} from '@terse-ui/core/utils';
import {State} from './state';

// ============================================================================
// Public API
// ============================================================================

/**
 * Context passed to each {@link StatePipelineHandler}.
 *
 * Every handler receives this and must return a value of type `T`.
 * Use {@link next} to delegate downstream, {@link stop} to halt
 * the pipeline, or return a value directly to short-circuit.
 */
export interface StatePipelineContext<S> {
  /**
   * Run the next handler in the pipeline, returning its result.
   *
   * When called with no arguments, the current state flows through.
   * Pass an override to replace the state seen by downstream handlers —
   * useful for suggesting a default that inner handlers can still transform.
   */
  next(value?: S): S;

  /**
   * True if a downstream handler called `stop()`.
   *
   * Check after `next()` to decide whether to honor the downstream
   * result or apply your own logic. A function (not a getter) so it
   * survives destructuring.
   */
  stopped(): boolean;

  /** Halt the pipeline — remaining downstream handlers will not run. */
  stop(): void;
}

/** Alias of {@link StateOptions} for use with {@link StatePipeline}. */
export type {StateOptions as StatePipelineOptions} from './state';

/**
 * A function that intercepts a {@link StatePipeline}'s value.
 *
 * Return a value directly to short-circuit, call `next()` to delegate
 * downstream, or transform the result of `next()` to wrap it.
 */
export type StatePipelineHandler<T> = (ctx: StatePipelineContext<T>) => T;

/**
 * A {@link State} with a middleware pipeline.
 *
 * Extends {@link State} by letting composing directives register
 * handlers that intercept, transform, or override the state before
 * it reaches the public {@link state} projection.
 *
 * Handlers are executed outermost-first (last appended runs first).
 * Each handler can delegate via `next()`, halt via `stop()`, or
 * return a value directly to short-circuit.
 *
 * @typeParam T - Internal state shape.
 * @typeParam R - Public state shape (defaults to `T`).
 *
 * @example
 * ```ts
 * // Atom — owns the state
 * class TabIndex extends StatePipeline<number> {
 *   readonly tabIndex = input(0, {transform: numberAttribute});
 *   constructor() { super(computed(() => this.tabIndex())); }
 * }
 *
 * // Composing directive — fallback pattern
 * class Button {
 *   constructor() {
 *     inject(TabIndex).append(({next}) => this.disabled() ? -1 : next() ?? 0);
 *   }
 * }
 *
 * // Composing directive — stop pattern
 * class MenuItem {
 *   constructor() {
 *     inject(Role).append(({stop}) => { stop(); return 'menuitem'; });
 *   }
 * }
 * ```
 */
export class StatePipeline<S, R = S> extends State<S, R> {
  readonly #handlers = signal([] as StatePipelineHandler<S>[]);

  protected override resolveState(): S {
    return executePipeline(this.#handlers(), Object.freeze(this.innerState()));
  }

  /**
   * Append a handler to the pipeline (outermost — runs first).
   *
   * This is the primary way composing directives intercept state.
   * Returns a removal function; the handler is also auto-removed
   * when the injection context is destroyed.
   */
  append(handler: StatePipelineHandler<DeepReadonly<S>>, opts?: {injector?: Injector}): () => void {
    return this.#use(handler as StatePipelineHandler<S>, {...opts, position: 'append'});
  }

  /**
   * Prepend a handler to the pipeline (innermost — runs last, closest to state).
   *
   * Use when you need to provide a base value that outer handlers can
   * override. Prefer {@link append} for most use cases.
   */
  prepend(
    handler: StatePipelineHandler<DeepReadonly<S>>,
    opts?: {injector?: Injector},
  ): () => void {
    return this.#use(handler as StatePipelineHandler<S>, {...opts, position: 'prepend'});
  }

  #use(
    handler: StatePipelineHandler<S>,
    opts?: {injector?: Injector; position: 'append' | 'prepend'},
  ): () => void {
    const {runInContext} = setupContext(opts?.injector, this.#use.bind(this));
    return runInContext(({onCleanup}) => {
      const position = opts?.position ?? 'append';
      this.#handlers.update((h) => (position === 'prepend' ? [handler, ...h] : [...h, handler]));

      const remove = () => {
        this.#handlers.update((h) => {
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
 * Run handlers from outermost to innermost. `next()` delegates inward;
 * `stop()` halts further delegation. Falls back to state when no handlers remain.
 */
function executePipeline<S>(handlers: StatePipelineHandler<S>[], state: S): S {
  let stopped = false;

  const execute = (index: number, current: S): S => {
    if (stopped || index < 0) return current;

    return (
      handlers[index]?.({
        next: (override?: S) => execute(index - 1, !isUndefined(override) ? override : current),
        stopped: () => stopped,
        stop() {
          stopped = true;
        },
      }) ?? current
    );
  };

  return execute(handlers.length - 1, state);
}
