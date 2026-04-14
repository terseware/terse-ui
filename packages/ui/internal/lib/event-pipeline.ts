import {computed, DestroyRef, inject, type Injector, signal, type Signal} from '@angular/core';
import {listener, type ListenerRef} from '@signality/core';
import {setupContext} from '@signality/core/internal';
import {injectElement} from './inject-element';
import {PerHost} from './per-host';

export interface EventPipelineContext<E extends Event> {
  readonly event: E;
  readonly defaultPrevented: boolean;
  readonly stopped: boolean;
  prevent(): void;
  stop(): void;
  next(): void;
}

export type EventPipelineHandler<E extends Event> = (ctx: EventPipelineContext<E>) => void;

export interface EventPipelineUseOptions {
  injector?: Injector;
  position?: 'append' | 'prepend';
}

export class EventPipeline<E extends Event = Event> {
  readonly #handlers = signal<EventPipelineHandler<E>[]>([]);
  readonly size: Signal<number> = computed(() => this.#handlers().length);
  readonly #listener: ListenerRef;

  constructor(eventName: keyof HTMLElementEventMap) {
    this.#listener = listener(injectElement(), eventName, this.dispatch.bind(this));
    inject(DestroyRef).onDestroy(() => this.#listener.destroy());
  }

  destroy(): void {
    this.#listener.destroy();
  }

  readonly dispatch = (event: E): void => {
    const handlers = this.#handlers();
    if (handlers.length === 0) return;
    executeEventChain(handlers, event);
  };

  use(handler: EventPipelineHandler<E>, options?: EventPipelineUseOptions): () => void;
  use(handler: EventPipelineHandler<E>, injector?: Injector): () => void;
  use(
    handler: EventPipelineHandler<E>,
    optionsOrInjector?: EventPipelineUseOptions | Injector,
  ): () => void {
    const opts = resolveEventUseOptions(optionsOrInjector);
    const {runInContext} = setupContext(opts.injector, this.use.bind(this));

    return runInContext(({onCleanup}) => {
      const position = opts.position ?? 'append';
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

function executeEventChain<E extends Event>(handlers: EventPipelineHandler<E>[], event: E): void {
  let stopped = false;
  let defaultPrevented = event.defaultPrevented;

  const execute = (index: number): void => {
    if (stopped || index < 0) return;

    handlers[index]?.({
      event,
      get defaultPrevented() {
        return defaultPrevented;
      },
      get stopped() {
        return stopped;
      },
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

function resolveEventUseOptions(
  input?: EventPipelineUseOptions | Injector,
): EventPipelineUseOptions {
  if (!input) return {};
  if (typeof (input as Injector).get === 'function') {
    return {injector: input as Injector};
  }
  return input as EventPipelineUseOptions;
}

@PerHost()
export class EventsPipeline {
  readonly #eventPipeline = new Map<
    keyof HTMLElementEventMap,
    EventPipeline<HTMLElementEventMap[keyof HTMLElementEventMap]>
  >();

  on<K extends keyof HTMLElementEventMap>(
    event: K,
    handler: EventPipelineHandler<HTMLElementEventMap[K]>,
  ): () => void {
    let pipeline = this.#eventPipeline.get(event) as
      | EventPipeline<HTMLElementEventMap[K]>
      | undefined;
    if (!pipeline) {
      pipeline = new EventPipeline<HTMLElementEventMap[K]>(event);
      this.#eventPipeline.set(event, pipeline as unknown as EventPipeline<Event>);
    }
    const remove = pipeline.use(handler);
    return () => {
      remove();
      if (pipeline.size() === 0) {
        pipeline.destroy();
        this.#eventPipeline.delete(event);
      }
    };
  }
}

export function on<K extends keyof HTMLElementEventMap>(
  event: K,
  handler: EventPipelineHandler<HTMLElementEventMap[K]>,
): () => void {
  return inject(EventsPipeline).on(event, handler);
}
