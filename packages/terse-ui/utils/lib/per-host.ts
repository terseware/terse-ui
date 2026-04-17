import {inject, Injectable, runInInjectionContext, untracked, type Injector} from '@angular/core';
import {setupContext} from '@signality/core/internal';
import {injectElement} from './inject-element';
import type {Constructor} from './typings';

/** Per-element singleton registry used by `@PerHost()`-decorated classes. */
@Injectable({providedIn: 'root'})
export class PerHostResolver {
  readonly #instances = new WeakMap<HTMLElement, Map<Constructor, unknown>>();

  #get<T extends object>(element: HTMLElement): Map<Constructor<T>, T> {
    let serviceMap = this.#instances.get(element) as Map<Constructor<T>, T> | undefined;
    if (!serviceMap) {
      serviceMap = new Map();
      this.#instances.set(element, serviceMap);
    }
    return serviceMap;
  }

  resolve<T extends object>(type: Constructor<T>, injector?: Injector): T {
    const {runInContext} = setupContext(injector, this.resolve.bind(this));
    return runInContext(({injector}) => {
      const element = injectElement();
      const serviceMap = this.#get<T>(element);
      let instance = serviceMap.get(type);
      if (!instance) {
        instance = untracked(() => runInInjectionContext(injector, () => new type()));
        serviceMap.set(type, instance);
      }
      return instance;
    });
  }

  static resolve<T extends object>(type: Constructor<T>, injector?: Injector): T {
    return inject(PerHostResolver).resolve<T>(type, injector);
  }
}

/** Class decorator that makes `inject(Type)` return a per-element singleton. */
export function PerHost() {
  return <T extends object, C extends Constructor<T>>(constructor: C): C => {
    Object.defineProperty(constructor, '__NG_ELEMENT_ID__', {
      value: (): T => PerHostResolver.resolve(constructor),
      configurable: true,
      enumerable: true,
      writable: true,
    });
    return constructor;
  };
}
