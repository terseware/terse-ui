import {computed, signal, type Signal, type WritableSignal} from '@angular/core';

export interface EventPipelineContext<E> {
  get event(): E;
  next(): void;
  halted(): boolean;
  halt(): void;
}

export type EventPipelineHandler<E> = (ctx: EventPipelineContext<E>) => void;

export interface EventPipelineInterceptOptions {
  readonly channel?: 'override' | 'FIFO' | 'LIFO';
}

type Channels<T> = {
  [K in NonNullable<EventPipelineInterceptOptions['channel']> as `${Lowercase<K>}`]: WritableSignal<
    EventPipelineHandler<T>[]
  >;
};

export interface EventPipeline<E> {
  readonly size: Signal<number>;
  intercept(handler: EventPipelineHandler<E>, opts?: EventPipelineInterceptOptions): () => void;
  dispatch(event: E): void;
}

export function eventPipeline<E>(): EventPipeline<E> {
  const {override, lifo, fifo}: Channels<E> = {
    override: signal<EventPipelineHandler<E>[]>([]),
    lifo: signal<EventPipelineHandler<E>[]>([]),
    fifo: signal<EventPipelineHandler<E>[]>([]),
  };

  const size = computed(() => override().length + lifo().length + fifo().length);

  const intercept = (
    handler: EventPipelineHandler<E>,
    opts?: EventPipelineInterceptOptions,
  ): (() => void) => {
    switch (opts?.channel) {
      case 'override': {
        override.update((h) => [handler, ...h]);
        return () => override.update((h) => h.filter((x) => x !== handler));
      }
      case 'FIFO': {
        fifo.update((h) => [...h, handler]);
        return () => fifo.update((h) => h.filter((x) => x !== handler));
      }
      default: {
        lifo.update((h) => [handler, ...h]);
        return () => lifo.update((h) => h.filter((x) => x !== handler));
      }
    }
  };

  const dispatch = (event: E): void => {
    const list = [...override(), ...fifo(), ...lifo()];
    if (list.length === 0) return;
    execute(list, event);
  };

  return {size, intercept, dispatch};
}

function execute<E>(handlers: EventPipelineHandler<E>[], event: E): void {
  let halted = false;

  const run = (index: number): void => {
    if (halted || index >= handlers.length) return;
    handlers[index]?.({
      get event() {
        return event;
      },
      halted: () => halted,
      halt: () => {
        halted = true;
      },
      next: () => {
        if (!halted) run(index + 1);
      },
    });
  };

  run(0);
}
