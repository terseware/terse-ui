import {HostAttributeToken, inject, type Injector} from '@angular/core';
import {setupContext} from '@signality/core/internal';
import {PerHost} from './per-host';

@PerHost()
class HostAttrCache {
  readonly ctx = setupContext();
  readonly cache = new Map<string, string | null>();

  get(attr: string): string | null {
    if (this.cache.has(attr)) {
      return this.cache.get(attr) ?? null;
    }

    const value = this.ctx.runInContext(() =>
      inject(new HostAttributeToken(attr), {optional: true}),
    );

    this.cache.set(attr, value);
    return value;
  }
}

export function hostAttr(attr: string, injector?: Injector): string | null {
  const {runInContext} = setupContext(injector, hostAttr);
  return runInContext(() => inject(HostAttrCache).get(attr));
}
