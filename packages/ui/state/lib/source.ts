import {type Signal} from '@angular/core';
import {applySignalClass} from '../internal/apply-class-signal';

/** Callable signal instance produced by {@link Source}. */
export interface Source<T> extends Signal<T> {
  (): T;
}

/** Read-only callable signal wrapper. For writable state, use `State`. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export abstract class Source<T> extends Function {
  declare private readonly _source: Signal<T>;

  constructor(source: Signal<T>) {
    super();
    applySignalClass(source, new.target.prototype, '_source');
    return source as this;
  }
}
