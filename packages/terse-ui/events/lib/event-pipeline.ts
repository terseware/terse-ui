import {computed, type Injector, signal, type Signal} from '@angular/core';
import {setupContext} from '@signality/core/internal';

/**
 * Context passed to each event pipeline handler.
 *
 * Handlers receive this context and perform side-effects (preventDefault,
 * click, etc.). Use `next()` to delegate, `stop()` to halt, or simply
 * return without calling `next()` to swallow the event.
 */
export interface EventPipelineContext<E extends Event> {
  /** The DOM event being processed. */
  readonly event: E;

  /**
   * True if `prevent()` was called by a prior handler in this pipeline run.
   *
   * Tracks pipeline-level state — may differ from `event.defaultPrevented`
   * if external code also called `preventDefault()`.
   */
  readonly defaultPrevented: boolean;

  /**
   * True if a downstream handler called `stop()`.
   *
   * Check after `next()` to decide whether to apply your own logic.
   * A function (not a getter) so it survives destructuring.
   */
  stopped(): boolean;

  /**
   * Call `event.preventDefault()`, idempotent within a pipeline run.
   *
   * Prefer this over calling `event.preventDefault()` directly so that
   * other handlers can check `defaultPrevented` reliably.
   */
  prevent(): void;

  /** Halt the pipeline — remaining downstream handlers will not run. */
  stop(): void;

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
 * Composing directives inject the pipeline and call {@link append} to
 * intercept events. Handlers delegate via `next()` or halt via `stop()`.
 * Last appended = outermost = runs first.
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
 *     inject(OnKeyDown).append(({event, next, stop}) => {
 *       if (event.key === ' ') { element.click(); stop(); return; }
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
   * Append a handler to the pipeline (outermost — runs first).
   *
   * This is the primary way composing directives intercept events.
   * Returns a removal function; the handler is also auto-removed
   * when the injection context is destroyed.
   */
  append(handler: EventPipelineHandler<E>, opts?: {injector?: Injector}): () => void {
    return this.#use(handler, {...opts, position: 'append'});
  }

  /**
   * Prepend a handler to the pipeline (innermost — runs last, closest to dispatch).
   *
   * Use when you need to provide a base handler that outer handlers can
   * override. Prefer {@link append} for most use cases.
   */
  prepend(handler: EventPipelineHandler<E>, opts?: {injector?: Injector}): () => void {
    return this.#use(handler, {...opts, position: 'prepend'});
  }

  #use(
    handler: EventPipelineHandler<E>,
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

/**
 * Run handlers from outermost to innermost. `next()` delegates inward;
 * `stop()` halts further delegation.
 */
function executeEventPipeline<E extends Event>(
  handlers: EventPipelineHandler<E>[],
  event: E,
): void {
  let stopped = false;
  let defaultPrevented = event.defaultPrevented;

  const execute = (index: number): void => {
    if (stopped || index < 0) return;

    handlers[index]?.({
      event,
      get defaultPrevented() {
        return defaultPrevented;
      },
      stopped: () => stopped,
      prevent() {
        if (!defaultPrevented) {
          defaultPrevented = true;
          event.preventDefault();
        }
      },
      stop() {
        stopped = true;
      },
      next() {
        if (!stopped) {
          execute(index - 1);
        }
      },
    });
  };

  execute(handlers.length - 1);
}
