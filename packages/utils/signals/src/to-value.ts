import {isSignal, untracked} from '@angular/core';
import type {MaybeSignal} from '@terse-ui/utils';

/**
 * Resolves a {@link MaybeSignal}, tracking signal reads in the current
 * reactive context. Use `.untracked` to suppress tracking.
 */
export function toValue<T>(v: MaybeSignal<T>): T {
  return isSignal(v) ? v() : v;
}
toValue.untracked = <T>(v: MaybeSignal<T>): T => (isSignal(v) ? untracked(v) : v);
