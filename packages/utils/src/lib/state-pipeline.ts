import {
  computed,
  isSignal,
  linkedSignal,
  signal,
  type CreateComputedOptions,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {deepComputed, type DeepSignal} from '@ngrx/signals';

export interface StatePipelineContext<T> {
  next(): T;
  halted(): boolean;
  halt(): void;
}

export type StatePipelineHandler<T> = (ctx: StatePipelineContext<T>) => T;

export interface StatePipelineOptions<T> extends CreateComputedOptions<T> {
  readonly finalize?: (value: T) => T;
}

export interface StatePipelineInterceptOptions {
  readonly channel?: 'override' | 'FIFO' | 'LIFO';
}

type Channels<T> = {
  [K in NonNullable<StatePipelineInterceptOptions['channel']> as `${Lowercase<K>}`]: WritableSignal<
    StatePipelineHandler<T>[]
  >;
};

interface Methods<T> {
  intercept(handler: StatePipelineHandler<T>, opts?: StatePipelineInterceptOptions): () => void;
  set(value: T): void;
  update(updater: (value: T) => T): void;
}

export interface StatePipeline<T> extends Signal<T>, Methods<T> {
  asReadonly(): Signal<T>;
}

export type PipelineDeepSignal<T extends object> = DeepSignal<T> &
  Methods<T> & {asReadonly(): DeepSignal<T>};

export interface StatePipelineFunction {
  <T>(source: T | Signal<T>, opts?: StatePipelineOptions<T>): StatePipeline<T>;
  deep<T extends object>(
    source: T | Signal<T>,
    opts?: StatePipelineOptions<T>,
  ): PipelineDeepSignal<T>;
}

function createPipeline<T>(
  source: T | Signal<T>,
  options?: StatePipelineOptions<T>,
): {
  result: Signal<T>;
  intercept: Methods<T>['intercept'];
  set: Methods<T>['set'];
  update: Methods<T>['update'];
} {
  const link = isSignal(source) ? linkedSignal(source) : signal(source);
  const finalize = options?.finalize ?? ((value: T) => value);

  const {override, fifo, lifo}: Channels<T> = {
    override: signal<StatePipelineHandler<T>[]>([]),
    lifo: signal<StatePipelineHandler<T>[]>([]),
    fifo: signal<StatePipelineHandler<T>[]>([]),
  };

  const intercept = (
    handler: StatePipelineHandler<T>,
    opts?: StatePipelineInterceptOptions,
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

  const methods: Methods<T> = {
    intercept: (handler, opts) => intercept(handler, opts),
    set: (value) => link.set(value),
    update: (updater) => link.update(updater),
  };

  const result = computed(
    () => finalize(executePipeline([...override(), ...fifo(), ...lifo()], link())),
    options,
  );

  return {result, ...methods};
}

function executePipeline<T>(handlers: StatePipelineHandler<T>[], state: T): T {
  let halted = false;

  const execute = (index: number, incoming: T): T => {
    if (halted || index >= handlers.length) return incoming;
    return (handlers[index] as StatePipelineHandler<T>)({
      next: () => execute(index + 1, incoming),
      halted: () => halted,
      halt() {
        halted = true;
      },
    });
  };

  return execute(0, state);
}

export const statePipeline: StatePipelineFunction = Object.assign(
  function <T>(source: T | Signal<T>, opts?: StatePipelineOptions<T>): StatePipeline<T> {
    const {result, intercept, set, update} = createPipeline(source, opts);
    const readOnly = computed(() => result());
    return Object.assign(result, {
      intercept,
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
      const {result, intercept, set, update} = createPipeline(source, opts);
      const readOnly = deepComputed(result);
      return Object.assign(deepComputed(result), {
        intercept,
        set,
        update,
        asReadonly: () => readOnly,
      });
    },
  },
);
