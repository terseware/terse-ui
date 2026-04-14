import {HostAttributeToken, inject, INJECTOR, runInInjectionContext} from '@angular/core';
import {PerHost} from './per-host';
import {staticCache} from './static-cache';

/** Cached read-access to static host attributes via `HostAttributeToken`. */
@PerHost()
export class HostAttributes {
  readonly #injector = inject(INJECTOR);

  readonly #cache = staticCache((key: string) =>
    runInInjectionContext(this.#injector, () =>
      inject(new HostAttributeToken(key), {optional: true}),
    ),
  );

  get(key: string) {
    return this.#cache(key);
  }
}

export function hostAttr(attr: string) {
  return inject(HostAttributes).get(attr);
}
