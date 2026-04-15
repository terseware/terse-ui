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
import {isUndefined} from '@terse-ui/core/utils';

export interface PipelineSignalContext<T> {
  get current(): T;
  next(value?: T): T;
  pipelineHalted(): boolean;
  haltPipeline(): void;
}

export type PipelineSignalHandler<T> = (ctx: PipelineSignalContext<T>) => T;

export interface PipelineSignalOptions<T> extends CreateComputedOptions<T> {
  normalize?: (value: T) => T;
}

export interface PipelinePipeOptions {
  injector?: Injector;
  /**
   * Insert at the front of the chain instead of the end.
   * ONLY USE AS A LAST RESORT.
   */
  prepend?: boolean;
}

interface Methods<T> {
  pipe(handler: PipelineSignalHandler<T>, opts?: PipelinePipeOptions): () => void;
}

export interface PipelineSignal<T> extends Signal<T>, Methods<T> {
  asReadonly(): Signal<T>;
}
export type PipelineDeepSignal<T extends object> = DeepSignal<T> &
  Methods<T> & {
    asReadonly(): DeepSignal<T>;
  };

export interface PipelineSignalFunction {
  <T>(source: T | Signal<T>, opts?: PipelineSignalOptions<T>): PipelineSignal<T>;
  deep<T extends object>(
    source: T | Signal<T>,
    opts?: PipelineSignalOptions<T>,
  ): PipelineDeepSignal<T>;
}

function createPipeline<T>(
  input: T | Signal<T>,
  opts?: PipelineSignalOptions<T>,
): Methods<T> & {result: Signal<T>} {
  const handlers = signal<PipelineSignalHandler<T>[]>([]);
  const normalize = opts?.normalize ?? ((value: T) => value);
  const source = isSignal(input) ? input : signal(input);
  const result = computed(() => normalize(executePipeline(handlers(), source())), opts);
  const pipe: Methods<T>['pipe'] = (handler, opts) => usePipeline(pipe, handler, handlers, opts);
  return {result, pipe};
}

/**
 * Run handlers in registration order (first piped runs first). `next()` delegates
 * to the next handler; `haltPipeline()` halts further delegation. Falls back to
 * state when no handlers remain.
 */
function executePipeline<T>(handlers: PipelineSignalHandler<T>[], state: T): T {
  let halted = false;

  const execute = (index: number, current: T): T => {
    if (halted || index >= handlers.length) return current;
    return (handlers[index] as PipelineSignalHandler<T>)({
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
  handler: PipelineSignalHandler<T>,
  handlers: WritableSignal<PipelineSignalHandler<T>[]>,
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

export const pipelineSignal: PipelineSignalFunction = Object.assign(
  function <T>(source: T | Signal<T>, opts?: PipelineSignalOptions<T>): PipelineSignal<T> {
    const {result, pipe} = createPipeline(source, opts);
    const readOnly = computed(() => result());
    return Object.assign(result, {pipe, asReadonly: () => readOnly});
  },
  {
    deep<T extends object>(
      source: T | Signal<T>,
      opts?: PipelineSignalOptions<T>,
    ): PipelineDeepSignal<T> {
      const {result, pipe} = createPipeline(source, opts);
      const readOnly = deepComputed(result);
      return Object.assign(deepComputed(result), {pipe, asReadonly: () => readOnly});
    },
  },
);
