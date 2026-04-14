import type {InjectOptions, Provider} from '@angular/core';
import {inject, InjectionToken, INJECTOR} from '@angular/core';
import type {DeepPartial, MaybeFn} from '../typings';
import {unwrapInject, unwrapMergeInject} from '../unwrap';

export type ConfigBuilderResult<C extends object> = [
  provideConfig: (cfg: MaybeFn<DeepPartial<C>>) => Provider[],
  injectConfig: (injConfig?: Omit<InjectOptions, 'optional'>) => C,
];

/**
 * Hierarchical DI-based options builder. Returns a `[provide, inject]` tuple;
 * each `provide(...)` contribution is deep-merged onto the default at
 * `inject()` time. Pass an optional `merger` to replace the default
 * `unwrapMerge` reducer.
 */
export function configBuilder<C extends object>(
  dbgName: string,
  defaultConfig: MaybeFn<C>,
  merger?: (contrib: DeepPartial<NoInfer<C>>[], defaultVal: NoInfer<C>) => NoInfer<C>,
): ConfigBuilderResult<C> {
  const cfgToken = new InjectionToken<C>(ngDevMode ? `Config:${dbgName}` : '');

  const cfgContributionToken = new InjectionToken<MaybeFn<DeepPartial<C>>[]>(
    ngDevMode ? `ConfigContribution:${dbgName}` : '',
  );

  function injectConfig(cfg: Omit<InjectOptions, 'optional'> = {}): C {
    const inj = inject(INJECTOR);
    const contrib = inject(cfgContributionToken, {...cfg, optional: true}) ?? [];
    if (merger) {
      return merger(
        contrib.map((c) => unwrapInject(inj, c)),
        unwrapInject(inj, defaultConfig),
      );
    }
    return unwrapMergeInject(inj, defaultConfig, ...contrib);
  }

  function provideConfig(cfg: MaybeFn<DeepPartial<C>>): Provider[] {
    return [
      {
        multi: true,
        provide: cfgContributionToken,
        useValue: cfg,
      },
      {
        provide: cfgToken,
        useFactory: injectConfig,
      },
    ];
  }

  return [provideConfig, injectConfig] as const;
}
