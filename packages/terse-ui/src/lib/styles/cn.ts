import {Directive, input} from '@angular/core';
import {hostAttr, statePipeline, type StatePipelineInterceptOptions} from '@terse-ui/core/utils';
import type {ClassValue} from 'clsx';
import {clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';
import {SuppressTransitions} from './suppress-transitions';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Composable class-merging host directive.
 *
 * Priority (last wins into `twMerge`):
 *   1. `intercept(...)` contributions (LIFO — outer composer runs first)
 *   2. static host `class="..."` (captured once as the pipeline seed)
 *   3. `[cn]` input (applied in `finalize` — always last, cannot be bypassed)
 *
 * `[attr.class]` is used so the directive owns the attribute; `[class]` would
 * let Angular's renderer re-merge the static class a second time.
 */
@Directive({
  selector: '[cn]',
  hostDirectives: [SuppressTransitions],
  host: {
    '[class]': 'state()',
  },
})
export class Cn {
  /** {@link cn}. */
  readonly cn = input<ClassValue>();

  readonly #state = statePipeline<ClassValue>(hostAttr('class'), {
    finalize: (merged) => cn(merged, this.cn()),
  });

  readonly state = this.#state.asReadonly();

  /** Register a class interceptor via {@link cn}. */
  intercept(value: () => ClassValue[] | string, opts?: StatePipelineInterceptOptions): () => void {
    return this.#state.intercept(({next}) => cn(next(), value()), opts);
  }
}
