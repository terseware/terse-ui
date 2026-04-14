import {
  computed,
  DestroyRef,
  Directive,
  HostAttributeToken,
  inject,
  INJECTOR,
  isDevMode,
  runInInjectionContext,
  signal,
  type Signal,
  type Type,
} from '@angular/core';
import {configBuilder} from './opts-builder';
import {PerHost} from './per-host';
import {staticCache} from './static-cache';
import {isObject} from './validators';

@PerHost()
class HostData {
  readonly #injector = inject(INJECTOR);

  readonly #hostAttrCache = staticCache((key: string) =>
    runInInjectionContext(this.#injector, () =>
      inject(new HostAttributeToken(key), {optional: true}),
    ),
  );
  attr(key: string) {
    return this.#hostAttrCache(key);
  }

  readonly #instances = new Map<Type<object>, object>();
  readonly #hostTypes = signal<string[]>([]);
  readonly types = computed(() => [...new Set(this.#hostTypes())].join(' '));
  registerInstance(instance: object) {
    const type = instance.constructor as Type<object>;
    if (this.#instances.has(type)) {
      throw new Error('Name already registered');
    }
    this.#instances.set(type, instance);
    this.#hostTypes.update((n) => [...n, type.name]);
    return () => {
      this.#instances.delete(type);
      this.#hostTypes.update((n) => n.filter((x) => x !== type.name));
    };
  }
}

export interface BaseCfg {
  debug:
    | boolean
    | {
        terseAttributes: boolean;
      };
}

const [provideBaseCfg, injectBaseCfg] = configBuilder<BaseCfg>('BaseCfg', () => ({
  debug: isDevMode(),
}));

export {provideBaseCfg};

// eslint-disable-next-line no-restricted-syntax
@Directive({
  host: {
    '[attr.data-tersetypes]': '_terseTypes?.() || ""',
  },
})
export abstract class Base {
  protected readonly baseCfg = injectBaseCfg();
  protected readonly host = inject(HostData);

  protected readonly _terseTypes?: Signal<string | null>;
  constructor() {
    inject(DestroyRef).onDestroy(this.host.registerInstance(this));

    const debug = this.baseCfg.debug;
    if (debug === true || (isObject(debug) && debug.terseAttributes)) {
      this._terseTypes = this.host.types;
    }
  }
}
