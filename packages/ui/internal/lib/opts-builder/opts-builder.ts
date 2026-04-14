import type {InjectOptions, Provider} from '@angular/core';
import {inject, InjectionToken, INJECTOR} from '@angular/core';
import type {DeepPartial, MaybeFn} from '../typings';
import {unwrapInject, unwrapMergeInject} from '../unwrap';

export type ConfigBuilderResult<Options extends object> = [
  provideOpts: (opts: MaybeFn<DeepPartial<Options>>) => Provider[],
  injectOpts: (injOpts?: Omit<InjectOptions, 'optional'>) => Options,
];

/**
 * Hierarchical DI-based options builder. Returns a `[provide, inject]` tuple;
 * each `provide(...)` contribution is deep-merged onto the default at
 * `inject()` time. Pass an optional `merger` to replace the default
 * `unwrapMerge` reducer.
 */
export function configBuilder<Opts extends object>(
  dbgName: string,
  defaultOpts: MaybeFn<Opts>,
  merger?: NoInfer<(contribs: DeepPartial<Opts>[], defaultVal: Opts) => Opts>,
): ConfigBuilderResult<Opts> {
  const optsToken = new InjectionToken<Opts>(ngDevMode ? `Opts:${dbgName}` : '');

  const optsContributionToken = new InjectionToken<MaybeFn<DeepPartial<Opts>>[]>(
    ngDevMode ? `OptsContribution:${dbgName}` : '',
  );

  function injectOpts(opts: Omit<InjectOptions, 'optional'> = {}): Opts {
    const inj = inject(INJECTOR);
    const contribs = inject(optsContributionToken, {...opts, optional: true}) ?? [];
    if (merger) {
      return merger(
        contribs.map((c) => unwrapInject(inj, c)),
        unwrapInject(inj, defaultOpts),
      );
    }
    return unwrapMergeInject(inj, defaultOpts, ...contribs);
  }

  function provideOpts(opts: MaybeFn<DeepPartial<Opts>>): Provider[] {
    return [
      {
        multi: true,
        provide: optsContributionToken,
        useValue: opts,
      },
      {
        provide: optsToken,
        useFactory: injectOpts,
      },
    ];
  }

  return [provideOpts, injectOpts] as const;
}
