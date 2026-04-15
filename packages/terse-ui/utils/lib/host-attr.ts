import {HostAttributeToken, inject, Injector} from '@angular/core';
import {setupContext} from '@signality/core/internal';

export function hostAttr(attr: string, injector?: Injector): string | null {
  const {runInContext} = setupContext(injector, hostAttr);
  return runInContext(() => inject(new HostAttributeToken(attr), {optional: true}));
}
