import {Directive, inject, input, model} from '@angular/core';
import {HostAttributes} from '@terseware/ui/internal';
import {ConcatState} from '@terseware/ui/state';
import clsx, {type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';
import {SupressTransitions} from './suppress-transitions';

/** Function that folds a list of class contributions into a single string. */
export type ClassesMergerValue = (result: ClassValue[]) => string;

/**
 * Composable host `class` binding. Contributions from composing directives
 * are stacked via {@link ConcatState}, flattened with the active merger,
 * and rendered onto `[class]`.
 */
@Directive({
  exportAs: 'terseClasses',
  hostDirectives: [SupressTransitions],
  host: {
    '[class]': 'value()',
  },
})
export class Classes extends ConcatState<string, ClassValue[] | string> {
  /** Consumer-supplied class(es) applied to the host element. */
  readonly class = input<ClassValue>(inject(HostAttributes).get('class'));
  readonly merger = model(clsx, {alias: 'classesMerger'});

  protected override merge(pre: string[], post: string[]): string {
    return this.merger()([...pre, this.class(), ...post])?.trim() || '';
  }
}

/** {@link Classes} with `tailwind-merge` deduping, plus a `variants()` CVA helper. */
@Directive({
  exportAs: 'terseTwClasses',
})
export class TwClasses extends Classes {
  constructor() {
    super();
    this.merger.set((c) => twMerge(clsx(c)));
  }

  /** Register a reactive class contribution. Returns a cleanup. */
  classes(fn: () => ClassValue[] | string): () => void {
    return this.pre(fn);
  }

  /** Wire a `cva()` variants function to reactive props. `class`/`className` are excluded — the consumer binding handles those. */
  variants<T>(
    cvaFn: (props: T) => string,
    props: () => {[K in keyof T as K extends 'class' | 'className' ? never : K]: NoInfer<T[K]>},
  ): () => void {
    return this.pre(() => cvaFn(props() as T));
  }
}
