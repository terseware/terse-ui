import {
  DestroyRef,
  inject,
  Injectable,
  Injector,
  NgZone,
  type ListenerOptions,
  type Provider,
} from '@angular/core';
import {EVENT_MANAGER_PLUGINS, EventManager} from '@angular/platform-browser';
import type {WithInjector} from '@signality/core';
import {setupContext} from '@signality/core/internal';
import {
  eventPipeline,
  injectElement,
  PerHost,
  type EventPipeline,
  type EventPipelineHandler,
  type EventPipelineInterceptOptions,
} from '@terse-ui/utils';

@PerHost()
class HostEvents {
  readonly injector = inject(Injector);
  readonly #element = injectElement();
  readonly #destroyRef = inject(DestroyRef);
  readonly #pipelines = new Map<string, EventPipeline<Event>>();
  readonly #manager = inject(HostEventsManager);

  constructor() {
    const rm = this.#manager.registerHostEvents(this.#element, this);
    this.#destroyRef.onDestroy(() => void rm());
  }

  #get<const K extends keyof HTMLElementEventMap>(event: K) {
    return this.#pipelines.get(event) as EventPipeline<HTMLElementEventMap[K]> | undefined;
  }

  resolve<const K extends keyof HTMLElementEventMap>(
    event: K,
  ): EventPipeline<HTMLElementEventMap[K]> {
    let pipeline = this.#get(event);
    if (pipeline) return pipeline;
    pipeline = eventPipeline<HTMLElementEventMap[K]>();
    this.#pipelines.set(event, pipeline);
    const rm = this.#manager.superAddListener(this.#element, event, (e) => pipeline.dispatch(e));
    this.#destroyRef.onDestroy(() => void rm());
    return pipeline;
  }
}

export function hostEvent<const K extends keyof HTMLElementEventMap>(
  event: K,
  handler: EventPipelineHandler<HTMLElementEventMap[K]>,
  opts?: EventPipelineInterceptOptions & WithInjector,
): () => void {
  const {runInContext} = setupContext(opts?.injector, hostEvent);
  return runInContext(({onCleanup}) => {
    const pipeline = inject(HostEvents).resolve(event);
    const interceptFn = pipeline.intercept(handler, opts);
    onCleanup(() => void interceptFn());
    return interceptFn;
  });
}

@Injectable()
export class HostEventsManager extends EventManager {
  readonly #hostEvents = new WeakMap<HTMLElement, HostEvents>();

  constructor() {
    super(inject(EVENT_MANAGER_PLUGINS), inject(NgZone));
  }

  registerHostEvents(element: HTMLElement, hostEvents: HostEvents): () => void {
    this.#hostEvents.set(element, hostEvents);
    return () => void this.#hostEvents.delete(element);
  }

  superAddListener<const K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    eventName: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: ListenerOptions,
  ): () => void {
    return super.addEventListener(element, eventName, handler, options) as () => void;
  }

  override addEventListener<const K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    eventName: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: ListenerOptions,
  ): () => void {
    const pipeline = this.#hostEvents.get(element)?.resolve(eventName);

    if (!pipeline) {
      return this.superAddListener(element, eventName, handler, options);
    }

    return pipeline.intercept(({next, event}) => {
      handler(event);
      next();
    });
  }
}

/**
 * Provides the {@link HostEventsManager} as Angular's {@link EventManager}.
 */
export function provideHostEvents(): Provider {
  return [HostEventsManager, {provide: EventManager, useExisting: HostEventsManager}];
}
