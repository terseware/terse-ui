import {DOCUMENT, effect, inject, Injectable, Injector, type EffectRef} from '@angular/core';
import {listener, setupSync, type WithInjector} from '@signality/core';
import {setupContext, type ContextRef} from '@signality/core/internal';
import {
  eventPipeline,
  type EventPipeline,
  type EventPipelineHandler,
  type EventPipelineInterceptOptions,
} from './event-pipeline';
import {SignalMap} from './signal-map';

@Injectable({providedIn: 'root'})
class DocEventsPipelines {
  readonly #document = inject(DOCUMENT);
  readonly #injector = inject(Injector);
  readonly #pipelines = new SignalMap<
    string,
    {
      pipeline: EventPipeline<HTMLElementEventMap[keyof HTMLElementEventMap]>;
      count: number;
    }
  >();

  constructor() {
    const injector = this.#injector;
    effect((onCleanup) => {
      setupSync(() => {
        const refs: EffectRef[] = [];
        for (const [e, {pipeline: pipe}] of this.#pipelines.entries()) {
          setupSync(() => {
            const ref = listener(this.#document, e, (h) => pipe.dispatch(h), {injector});
            refs.push(ref);
          });
        }
        onCleanup(() => refs.forEach((r) => r.destroy()));
      });
    });
  }

  get<const K extends keyof HTMLElementEventMap>(event: K, ctxRef: ContextRef) {
    let data = this.#pipelines.get(event);

    if (data) {
      const {pipeline, count} = data;
      this.#pipelines.set(event, {pipeline, count: count + 1});
    } else {
      data = {pipeline: eventPipeline<HTMLElementEventMap[K]>(), count: 1};
      this.#pipelines.set(event, data);
    }

    ctxRef.onCleanup(() => {
      const {pipeline, count} = data;
      this.#pipelines.set(event, {pipeline, count: count - 1});
      queueMicrotask(() => {
        if (count === 0) this.#pipelines.delete(event);
      });
    });

    return data.pipeline as EventPipeline<HTMLElementEventMap[K]>;
  }
}

export function docEventPipeline<const K extends keyof HTMLElementEventMap>(
  event: K,
  handler: EventPipelineHandler<HTMLElementEventMap[K]>,
  opts?: EventPipelineInterceptOptions & WithInjector,
): () => void {
  const {runInContext} = setupContext(opts?.injector, docEventPipeline);
  return runInContext((ctxRef) => {
    const pipeline = inject(DocEventsPipelines).get(event, ctxRef);
    return pipeline.intercept(handler, opts);
  });
}
