import {
  inject,
  Injectable,
  InjectionToken,
  Injector,
  runInInjectionContext,
  untracked,
  type Provider,
} from '@angular/core';
import type {WithInjector} from '@signality/core';
import {setupContext} from '@signality/core/internal';
import {injectElement} from './inject-element';
import type {Constructor} from './types/primitive-types';

export interface PerHostResolverOptions extends WithInjector {
  readonly providers?: Provider[];
}

/** Per-element singleton registry used by `@PerHost()`-decorated classes. */
@Injectable({providedIn: 'root'})
export class PerHostResolver {
  readonly #instances = new WeakMap<HTMLElement, Map<object, unknown>>();

  #get<T>(element: HTMLElement): Map<object, T> {
    let serviceMap = this.#instances.get(element) as Map<object, T> | undefined;
    if (!serviceMap) {
      serviceMap = new Map();
      this.#instances.set(element, serviceMap);
    }
    return serviceMap;
  }

  resolve<T>(objKey: object, factory: () => T, options?: PerHostResolverOptions): T {
    const {runInContext} = setupContext(options?.injector, this.resolve.bind(this));
    return runInContext(({injector: refInj}) => {
      const element = injectElement<HTMLElement>();
      const serviceMap = this.#get<T>(element);

      let instance = serviceMap.get(objKey);
      if (instance) return instance;

      const injector = options?.providers
        ? Injector.create({parent: refInj, providers: options.providers})
        : refInj;

      instance = untracked(() => runInInjectionContext(injector, () => factory()));
      serviceMap.set(objKey, instance);
      return instance;
    });
  }

  static resolve<T>(objKey: object, factory: () => T, options?: PerHostResolverOptions): T {
    return inject(PerHostResolver).resolve<T>(objKey, factory, options);
  }
}

/** Class decorator that makes `inject(Type)` return a per-element singleton. */
export function PerHost() {
  return <T extends object, C extends Constructor<T>>(constructor: C): C => {
    Object.defineProperty(constructor, '__NG_ELEMENT_ID__', {
      value: (): T => PerHostResolver.resolve<T>(constructor, () => new constructor()),
      configurable: true,
      enumerable: true,
      writable: true,
    });
    return constructor;
  };
}

/** Creates a per-element singleton injection token. */
export function perHost<T>(factory: () => T): InjectionToken<T> {
  const token = new InjectionToken<T>(factory.name);
  Object.defineProperty(token, '__NG_ELEMENT_ID__', {
    value: (): T => PerHostResolver.resolve<T>(token, factory),
    configurable: true,
    enumerable: true,
    writable: true,
  });
  return token;
}
