import {
  computed,
  Injector,
  isSignal,
  signal,
  type CreateComputedOptions,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {setupContext} from '@signality/core/internal';
import {isUndefined, toDeepSignal, type DeepSignal} from '@terse-ui/core/utils';

export interface PipelineSignalContext<T> {
  get current(): T;
  next(value?: T): T;
  stopped(): boolean;
  stop(): void;
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

export interface PipelineSignal<T> extends Signal<T>, Methods<T> {}
export type PipelineDeepSignal<T extends object> = DeepSignal<T> & Methods<T>;

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
 * Run handlers from outermost to innermost. `next()` delegates inward;
 * `stop()` halts further delegation. Falls back to state when no handlers remain.
 */
function executePipeline<T>(handlers: PipelineSignalHandler<T>[], state: T): T {
  let stopped = false;

  const execute = (index: number, current: T): T => {
    if (stopped || index >= handlers.length) return current;
    return (handlers[index] as PipelineSignalHandler<T>)({
      get current() {
        return current;
      },
      next: (value?: T) => execute(index + 1, isUndefined(value) ? current : value),
      stopped: () => stopped,
      stop() {
        stopped = true;
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
    return Object.assign(result, {pipe});
  },
  {
    deep<T extends object>(
      source: T | Signal<T>,
      opts?: PipelineSignalOptions<T>,
    ): PipelineDeepSignal<T> {
      const {result, pipe} = createPipeline(source, opts);
      return Object.assign(toDeepSignal(result), {pipe});
    },
  },
);
