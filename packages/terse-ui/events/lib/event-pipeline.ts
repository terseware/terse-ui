import {computed, type Injector, signal, type Signal} from '@angular/core';
import {setupContext} from '@signality/core/internal';

/**
 * Context passed to each event pipeline handler.
 *
 * Handlers receive this context and perform side-effects (preventDefault,
 * click, etc.). Use `next()` to delegate, `haltPipeline()` to halt, or simply
 * return without calling `next()` to swallow the event.
 */
export interface EventPipelineContext<E extends Event> {
  /** The DOM event being processed. */
  get event(): E;

  /**
   * Call `event.preventDefault()`, idempotent within a pipeline run.
   *
   * Prefer this over calling `event.preventDefault()` directly so that
   * other handlers can check `defaultPrevented` reliably.
   */
  preventDefault(): void;

  /**
   * True if `preventDefault()` was called by a prior handler in this pipeline run.
   *
   * Tracks pipeline-level state — may differ from `event.defaultPrevented`
   * if external code also called `preventDefault()`.
   */
  defaultPrevented(): boolean;

  /** Halt the pipeline — remaining downstream handlers will not run. */
  haltPipeline(): void;

  /**
   * True if a downstream handler called `haltPipeline()`.
   *
   * Check after `next()` to decide whether to apply your own logic.
   * A function (not a getter) so it survives destructuring.
   */
  pipelineHalted(): boolean;

  /** Run the next handler in the pipeline. */
  next(): void;
}

/**
 * A handler that intercepts an event pipeline dispatch.
 *
 * Unlike state pipeline handlers, event handlers return `void` — they
 * perform side-effects rather than producing a value.
 */
export type EventPipelineHandler<E extends Event> = (ctx: EventPipelineContext<E>) => void;

/**
 * Reactive middleware pipeline for DOM events.
 *
 * Subclasses bind a host event (e.g. `(keydown)`) and call {@link dispatch}.
 * Composing directives inject the pipeline and call {@link pipe} to
 * intercept events. Handlers delegate via `next()` or halt via `haltPipeline()`.
 * Registration order determines run order — first piped runs first.
 *
 * @example
 * ```ts
 * // Atom — binds to the DOM event
 * @Directive({ host: { '(keydown)': 'dispatch($event)' } })
 * class OnKeyDown extends EventPipeline<KeyboardEvent> {}
 *
 * // Composing directive — intercepts Space for immediate activation
 * class CompositeItem {
 *   constructor() {
 *     inject(OnKeyDown).pipe(({event, next, haltPipeline}) => {
 *       if (event.key === ' ') { element.click(); haltPipeline(); return; }
 *       next();
 *     });
 *   }
 * }
 * ```
 */
export class EventPipeline<E extends Event = Event> {
  readonly #handlers = signal<EventPipelineHandler<E>[]>([]);
  /** Number of registered handlers. */
  readonly size: Signal<number> = computed(() => this.#handlers().length);

  /** Dispatch an event through the pipeline. Called by host bindings. */
  protected dispatch(event: E): void {
    const handlers = this.#handlers();
    if (handlers.length === 0) return;
    executeEventPipeline(handlers, event);
  }

  /**
   * Pipe a handler to the pipeline (first in chain — runs first).
   *
   * Returns a removal function; the handler is also auto-removed
   * when the injection context is destroyed.
   */
  pipe(
    handler: EventPipelineHandler<E>,
    opts?: {
      injector?: Injector;
      /**
       * Insert at the front of the chain instead of the end.
       * ONLY USE AS A LAST RESORT.
       */
      prepend?: boolean;
    },
  ): () => void {
    const {runInContext} = setupContext(opts?.injector, this.pipe.bind(this));

    return runInContext(({onCleanup}) => {
      this.#handlers.update((h) => (opts?.prepend ? [handler, ...h] : [...h, handler]));
      const remove = () => this.#handlers.update((ha) => ha.filter((h) => h !== handler));
      onCleanup(remove);
      return remove;
    });
  }
}

/**
 * Run handlers in registration order (first piped runs first). `next()` delegates
 * to the next handler; `haltPipeline()` halts further delegation.
 */
function executeEventPipeline<E extends Event>(
  handlers: EventPipelineHandler<E>[],
  event: E,
): void {
  let halted = false;
  let defaultPrevented = event.defaultPrevented;

  const execute = (index: number): void => {
    if (halted || index >= handlers.length) return;
    handlers[index]?.({
      get event() {
        return event;
      },
      defaultPrevented() {
        return defaultPrevented;
      },
      pipelineHalted() {
        return halted;
      },
      preventDefault() {
        if (!defaultPrevented) {
          defaultPrevented = true;
          event.preventDefault();
        }
      },
      haltPipeline() {
        halted = true;
      },
      next() {
        if (!halted) {
          execute(index + 1);
        }
      },
    });
  };

  execute(0);
}
