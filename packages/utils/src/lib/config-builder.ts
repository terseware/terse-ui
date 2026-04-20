import type {InjectOptions, Provider} from '@angular/core';
import {inject, InjectionToken, INJECTOR} from '@angular/core';
import type {MaybeFn} from './types/primitive-types';
import type {DeepPartial} from './types/recursion-types';
import {unwrapInject, unwrapMergeInject} from './unwrap';

export type ConfigBuilderResult<C extends object> = [
  provideConfig: (cfg: MaybeFn<DeepPartial<C>>) => Provider[],
  injectConfig: (injConfig?: Omit<InjectOptions, 'optional'>) => C,
];

/**
 * Build a `[provide, inject]` tuple for a typed, DI-backed config surface.
 *
 * Every `provide(...)` contribution up the injector tree is collected; at
 * `inject()` time they're deep-merged onto `defaultConfig` (or processed by a
 * custom `merger`). Later providers win, but object shape is preserved — great
 * for library defaults that callers refine in pieces.
 * ```
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
