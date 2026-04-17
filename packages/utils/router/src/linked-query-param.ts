import {computed, effect, inject, Injectable, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, type NavigationExtras} from '@angular/router';
import {setupContext, type MaybeSignal, type WithInjector} from '@terse-ui/utils';
import {delegatedSignal, SignalMap, toValue} from '@terse-ui/utils/signals';

type StringifyReturnType = string | number | boolean | null | undefined;

type NavigateMethodFields = Pick<
  NavigationExtras,
  | 'queryParamsHandling'
  | 'onSameUrlNavigation'
  | 'replaceUrl'
  | 'skipLocationChange'
  | 'preserveFragment'
>;

/**
 * Service to coalesce multiple navigation calls into a single navigation event.
 */
@Injectable({providedIn: 'root'})
class QpNavigationScheduler {
  readonly #router = inject(Router);
  readonly #queryParams = new SignalMap<string, StringifyReturnType>();
  readonly #extras = signal<NavigationExtras>({});

  constructor() {
    effect(() => {
      const queryParams = Object.fromEntries(this.#queryParams.entries());
      const extras = this.#extras();
      this.#router.navigate([], {queryParams, ...extras});
    });
  }

  emit(key: string, value: StringifyReturnType, extras: Partial<NavigateMethodFields>) {
    this.#queryParams.set(key, value);
    this.#extras.update((e) => ({...e, ...extras}));
  }
}

export interface LinkedQueryParamOptions<T> extends NavigateMethodFields {
  readonly key: MaybeSignal<string | undefined>;
  readonly parse: (value: string | null) => T;
  readonly stringify: (value: NoInfer<T>) => StringifyReturnType;
  readonly equal?: (a: NoInfer<T>, b: NoInfer<T>) => boolean;
}

/**
 * Creates a {@link WritableSignal} that reads and writes a query parameter value.
 */
export function linkedQueryParam<T>(options: LinkedQueryParamOptions<T>, opts?: WithInjector) {
  const {runInContext} = setupContext(opts?.injector, linkedQueryParam);
  return runInContext(() => {
    const scheduler = inject(QpNavigationScheduler);
    const route = inject(ActivatedRoute);
    const qpMap = toSignal(route.queryParamMap);

    const qpValue = computed<string | null>(() => {
      const k = toValue(options.key);
      if (k === undefined) return null;
      return qpMap()?.get(k)?.trim() ?? null;
    });

    return delegatedSignal({
      read: () => {
        const qp = qpValue();
        if (qp === null) return options.parse(null);
        return options.parse(qp);
      },
      write: (v) => {
        const k = toValue(options.key);
        if (k === undefined) return;
        const stringify = options.stringify;
        if (stringify === undefined) return;
        scheduler.emit(k, stringify(v), options);
      },
      equal: (a, b) => {
        const equal = options.equal;
        if (equal === undefined) return a === b;
        return equal(a, b);
      },
    });
  });
}
