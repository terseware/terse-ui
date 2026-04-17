import {inject, type EffectCleanupRegisterFn} from '@angular/core';
import {injectElement, PerHost, setupContext} from '@terse-ui/utils';
import {eventPipeline, type EventPipeline} from './event-pipeline';
import {listener} from './listener';

@PerHost()
class HostEventsPipeline {
  readonly #pipelines = new Map<string, EventPipeline<Event>>();
  get<const K extends keyof HTMLElementEventMap>(
    event: K,
    onCleanup: EffectCleanupRegisterFn,
  ): EventPipeline<HTMLElementEventMap[K]> {
    let pipeline = this.#pipelines.get(event);
    if (!pipeline) {
      const pl = (pipeline = eventPipeline<Event>());
      const ref = listener(injectElement(), event, (h) => pl.dispatch(h));
      onCleanup(() => ref.destroy());
      this.#pipelines.set(event, pipeline);
    }
    return pipeline as EventPipeline<HTMLElementEventMap[K]>;
  }
}

export function onHostEvent<const K extends keyof HTMLElementEventMap>(
  event: K,
  ...args: Parameters<EventPipeline<HTMLElementEventMap[K]>['intercept']>
): () => void {
  const {runInContext} = setupContext(args[1]?.injector, onHostEvent);
  return runInContext(({onCleanup}) => {
    const pipeline = inject(HostEventsPipeline).get(event, onCleanup);
    return pipeline.intercept(...args);
  });
}
