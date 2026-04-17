import {DOCUMENT, inject, Injectable, type EffectCleanupRegisterFn} from '@angular/core';
import {setupContext} from '@terse-ui/utils';
import {eventPipeline, type EventPipeline} from './event-pipeline';
import {listener, setupSync} from './listener';

@Injectable({providedIn: 'root'})
class DocEventsPipeline {
  readonly #pipelines = new Map<string, EventPipeline<Event>>();
  get<const K extends keyof HTMLElementEventMap>(
    event: K,
    doc: Document,
    onCleanup: EffectCleanupRegisterFn,
  ): EventPipeline<HTMLElementEventMap[K]> {
    let pipeline = this.#pipelines.get(event);
    if (!pipeline) {
      const pl = (pipeline = eventPipeline<Event>());
      setupSync(() => {
        const ref = listener(doc, event, (h) => pl.dispatch(h));
        onCleanup(() => ref.destroy());
      });
      this.#pipelines.set(event, pipeline);
    }
    return pipeline as EventPipeline<HTMLElementEventMap[K]>;
  }
}

/**
 * Like {@link onHostEvent}, but the pipeline is bound to the top-level `document`
 * and shared app-wide. Use for global shortcuts, outside-click detection, or
 * any behavior that must observe events outside the host element.
 *
 * Because every caller shares one pipeline per event name, remember to call
 * `next()` to play nice with other interceptors — swallowing an event here
 * affects the whole app's listeners for that event.
 */
export function onDocEvent<const K extends keyof HTMLElementEventMap>(
  event: K,
  ...args: Parameters<EventPipeline<HTMLElementEventMap[K]>['intercept']>
): () => void {
  const {runInContext} = setupContext(args[1]?.injector, onDocEvent);
  return runInContext(({onCleanup}) => {
    const pipeline = inject(DocEventsPipeline).get(event, inject(DOCUMENT), onCleanup);
    return pipeline.intercept(...args);
  });
}
