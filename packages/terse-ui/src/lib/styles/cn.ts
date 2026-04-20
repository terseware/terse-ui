import {Directive, input} from '@angular/core';
import {hostAttr, statePipeline, type StatePipelineInterceptOptions} from '@terse-ui/utils';
import type {ClassValue} from 'clsx';
import {clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';
import {SuppressTransitions} from './suppress-transitions';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Composable class-merging host directive using {@link cn}.
 */
@Directive({
  selector: '[cn]',
  hostDirectives: [SuppressTransitions],
  host: {
    '[class]': 'state()',
  },
})
export class Cn {
  /** Maps class input to {@link cn}. */
  readonly class = input.required<ClassValue>();

  readonly #classes = [hostAttr('cn'), hostAttr('className'), hostAttr('class')];

  readonly #state = statePipeline<ClassValue>('', {
    finalize: (merged) => cn(merged, this.class(), ...this.#classes),
  });

  /** Classes from host attributes `[cn]`, `[className]`, and `[class]` and input {@link class}. */
  readonly state = this.#state.asReadonly();

  /** Register a class interceptor via {@link cn}. */
  intercept(value: () => ClassValue[] | string, opts?: StatePipelineInterceptOptions): () => void {
    return this.#state.intercept(({next}) => cn(next(), value()), opts);
  }
}
