import {InjectionToken} from '@angular/core';
import type {Branded} from './types/util-types';

/** Branded id format produced by {@link IdGenerator.generate} — e.g. `'menu-3'`. */
export type Id<P extends string = string> = Branded<`${P}-${number}`, 'Id'>;

/**
 * Platform-wide monotonic id generator.
 */
export const IdGenerator = new InjectionToken(ngDevMode ? 'IdGenerator' : '', {
  providedIn: 'platform',
  factory: () => {
    const map = new Map<string, number>();
    let num = 0;
    return {
      /** Returns a new `${prefix}-${n}` id. Empty prefix falls back to `'id'`. */
      generate<const P extends string>(prefix: P): Id<P> {
        prefix = (prefix.trim() || 'id') as P;
        const id = (map.get(prefix) ?? 0) + 1;
        map.set(prefix, id);
        return `${prefix}-${id}` as Id<P>;
      },
      /** Returns a fresh monotonic number independent of any prefix counter. */
      num(): number {
        return ++num;
      },
    };
  },
});
