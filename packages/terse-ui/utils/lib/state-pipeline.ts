import {
  computed,
  isSignal,
  signal,
  type CreateComputedOptions,
  type Injector,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {deepComputed, type DeepSignal} from '@ngrx/signals';
import {setupContext} from '@signality/core/internal';
import {isUndefined} from './validators';

export interface StateStatePipelineContext<T> {
  get current(): T;
  next(value?: T): T;
  pipelineHalted(): boolean;
  haltPipeline(): void;
}

export type StatePipelineHandler<T> = (ctx: StateStatePipelineContext<T>) => T;

export interface StatePipelineOptions<T> extends CreateComputedOptions<T> {
  readonly finalize?: (value: T) => T;
  readonly initHandler?: StatePipelineHandler<T>;
}

export interface PipelinePipeOptions {
  readonly injector?: Injector;
  /**
   * Insert at the front of the chain instead of the end.
   * ONLY USE AS A LAST RESORT.
   */
  readonly prepend?: boolean;
}

interface Methods<T> {
  pipe(handler: StatePipelineHandler<T>, opts?: PipelinePipeOptions): () => void;
  append(value: T): void;
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
  opts?: StatePipelineOptions<T>,
): {result: Signal<T>; pipe: Methods<T>['pipe']; append: Methods<T>['append']} {
  const link = isSignal(source) ? source : signal(source);
  const finalize = opts?.finalize ?? ((value: T) => value);
  const handlers = signal<StatePipelineHandler<T>[]>(opts?.initHandler ? [opts.initHandler] : []);
  const result = computed(() => finalize(executePipeline(handlers(), link())), opts);
  const pipe: Methods<T>['pipe'] = (handler, opts) => usePipeline(pipe, handler, handlers, opts);
  const append: Methods<T>['append'] = (value) => pipe(({next}) => next(value));
  return {result, pipe, append};
}

/**
 * Run handlers in registration order (first piped runs first). `next()` delegates
 * to the next handler; `haltPipeline()` halts further delegation. Falls back to
 * state when no handlers remain.
 */
function executePipeline<T>(handlers: StatePipelineHandler<T>[], state: T): T {
  let halted = false;

  const execute = (index: number, current: T): T => {
    if (halted || index >= handlers.length) return current;
    return (handlers[index] as StatePipelineHandler<T>)({
      get current() {
        return current;
      },
      next: (value?: T) => execute(index + 1, isUndefined(value) ? current : value),
      pipelineHalted: () => halted,
      haltPipeline() {
        halted = true;
      },
    });
  };

  return execute(0, state);
}

function usePipeline<T>(
  functionName: (...args: never[]) => unknown,
  handler: StatePipelineHandler<T>,
  handlers: WritableSignal<StatePipelineHandler<T>[]>,
  opts?: PipelinePipeOptions,
): () => void {
  const {runInContext} = setupContext(opts?.injector, functionName);
  return runInContext(({onCleanup}) => {
    handlers.update((h) => (opts?.prepend ? [handler, ...h] : [...h, handler]));
    const remove = () => handlers.update((ha) => ha.filter((h) => h !== handler));
    onCleanup(remove);
    return remove;
  });
}

export const statePipeline: StatePipelineFunction = Object.assign(
  function <T>(source: T | Signal<T>, opts?: StatePipelineOptions<T>): StatePipeline<T> {
    const {result, pipe, append} = createPipeline(source, opts);
    const readOnly = computed(() => result());
    return Object.assign(result, {pipe, append, asReadonly: () => readOnly});
  },
  {
    deep<T extends object>(
      source: T | Signal<T>,
      opts?: StatePipelineOptions<T>,
    ): PipelineDeepSignal<T> {
      const {result, pipe, append} = createPipeline(source, opts);
      const readOnly = deepComputed(result);
      return Object.assign(deepComputed(result), {pipe, append, asReadonly: () => readOnly});
    },
  },
);
