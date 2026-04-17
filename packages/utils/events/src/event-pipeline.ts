import {computed, type Injector, signal, type Signal} from '@angular/core';
import {setupContext} from '@terse-ui/utils';

/**
 * Context passed to every {@link EventPipelineHandler}.
 *
 * A handler performs side-effects and can:
 * - return without calling {@link next} to swallow the event (inner handlers never run),
 * - call {@link next} to delegate to the inner (earlier-registered) handler,
 * - call {@link halt} to stop further delegation,
 * - call {@link preventDefault} to cancel the DOM event's default action.
 */
export interface EventPipelineContext<E extends Event> {
  /** The DOM event being dispatched. */
  get event(): E;

  /**
   * Delegate to the next handler inward (the one registered *before* this one).
   * No-op once {@link halt} has been called or when there are no inner handlers
   * remaining.
   */
  next(): void;

  /** `true` once any handler in this dispatch has called {@link halt}. */
  halted(): boolean;

  /** Stop delegation. Inner handlers not yet invoked are skipped. */
  halt(): void;

  /**
   * Call `event.preventDefault()`. Idempotent within a single dispatch so
   * composers can freely signal intent without worrying about double-invocation.
   */
  preventDefault(): void;

  /**
   * `true` if {@link preventDefault} was called earlier in this dispatch, or
   * if the event arrived with `defaultPrevented` already set. A function (not
   * a getter) so it survives destructuring.
   */
  defaultPrevented(): boolean;
}

/** A single handler in an {@link EventPipeline}. */
export type EventPipelineHandler<E extends Event> = (ctx: EventPipelineContext<E>) => void;

/** Options accepted by {@link EventPipeline.intercept}. */
export interface EventPipelineInterceptOptions {
  /** Injector used to resolve the `DestroyRef` for auto-cleanup. Defaults to the current injection context. */
  readonly injector?: Injector;
}

/**
 * Middleware chain for a single DOM event. A host directive wires the event
 * to {@link dispatch}; composing directives call {@link intercept} to wrap it.
 */
export interface EventPipeline<E extends Event = Event> {
  /** Number of registered handlers. */
  readonly size: Signal<number>;

  /**
   * Register a handler. Execution is LIFO, so the most recently intercepted
   * handler runs **first** — outer composers naturally get first crack at the
   * event, with earlier-registered (inner) handlers reached via `next()`.
   *
   * Auto-removes when the calling injection context is destroyed. The returned
   * function removes the handler early if needed.
   */
  intercept(handler: EventPipelineHandler<E>, opts?: EventPipelineInterceptOptions): () => void;

  /** Dispatch an event through the chain. Typically called from a host binding. */
  dispatch(event: E): void;
}

/**
 * Create an {@link EventPipeline}.
 *
 * ## Why LIFO
 *
 * In Angular's `hostDirectives`, inner primitives construct before outer
 * composers — so by the time an outer composer intercepts, the primitive's
 * handler is already registered. LIFO means the outer composer (the
 * specialization) runs first and reaches the primitive's default behavior via
 * `next()`. This eliminates "prepend to intercept" workarounds and makes the
 * composition shape the obvious one: outer wraps inner.
 *
 * ## Halting vs swallowing
 *
 * - **Swallow an event for this chain only**: return without calling `next()`.
 *   Inner handlers don't run; other listeners on the element still do.
 * - **Halt the chain explicitly**: call `halt()`. Same observable effect as
 *   swallowing, but surfaces via `halted()` so handlers higher in the stack
 *   can detect it after their `next()` returns.
 * - **Cancel the DOM event**: call `preventDefault()`. Orthogonal to halting —
 *   affects the browser's default action, not pipeline flow.
 *
 * @example
 * ```ts
 * // Atom — wires a DOM event and owns the pipeline.
 * @Directive({host: {'(keydown)': 'dispatch($event)'}})
 * export class OnKeyDown {
 *   readonly #pipeline = eventPipeline<KeyboardEvent>();
 *   readonly size = this.#pipeline.size;
 *   readonly intercept = this.#pipeline.intercept;
 *   readonly dispatch = this.#pipeline.dispatch;
 * }
 *
 * // Primitive — registers first, runs last. Its logic is the default.
 * class Button {
 *   constructor() {
 *     inject(OnKeyDown).intercept(({event}) => {
 *       if (event.key === 'Enter') this.el.click();
 *     });
 *   }
 * }
 *
 * // Outer composer — registers last, runs first. Intercepts before Button.
 * class MenuItem {
 *   constructor() {
 *     inject(OnKeyDown).intercept(({event, next, halt, preventDefault}) => {
 *       if (event.key === ' ') {
 *         preventDefault();
 *         this.activate();
 *         halt();
 *         return;
 *       }
 *       next(); // delegate to Button's default Enter handling
 *     });
 *   }
 * }
 * ```
 */
export function eventPipeline<E extends Event = Event>(): EventPipeline<E> {
  const handlers = signal<EventPipelineHandler<E>[]>([]);
  const size = computed(() => handlers().length);

  const intercept = (
    handler: EventPipelineHandler<E>,
    opts?: EventPipelineInterceptOptions,
  ): (() => void) => {
    const {runInContext} = setupContext(opts?.injector, intercept);
    return runInContext(({onCleanup}) => {
      handlers.update((h) => [...h, handler]);
      const remove = () => handlers.update((h) => h.filter((x) => x !== handler));
      onCleanup(remove);
      return remove;
    });
  };

  const dispatch = (event: E): void => {
    const list = handlers();
    if (list.length === 0) return;
    execute(list, event);
  };

  return {size, intercept, dispatch};
}

/**
 * Walk the handler list in reverse registration order so the last intercepted
 * handler runs first. `next()` delegates inward by decrementing the index;
 * `halt()` short-circuits further delegation.
 */
function execute<E extends Event>(handlers: EventPipelineHandler<E>[], event: E): void {
  let halted = false;
  let prevented = event.defaultPrevented;

  const run = (index: number): void => {
    if (halted || index < 0) return;
    handlers[index]?.({
      get event() {
        return event;
      },
      defaultPrevented: () => prevented,
      halted: () => halted,
      preventDefault: () => {
        if (!prevented) {
          prevented = true;
          event.preventDefault();
        }
      },
      halt: () => {
        halted = true;
      },
      next: () => {
        if (!halted) run(index - 1);
      },
    });
  };

  run(handlers.length - 1);
}
