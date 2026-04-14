import {isSignal, linkedSignal, type Signal} from '@angular/core';
import {isString} from '@terseware/ui/internal';
import {State} from './state';

/** An element id ref — either a resolved string or a signal that returns one. */
export type IdListItem = string | Signal<string>;

/**
 * Reactive ordered list of id refs rendered as a space-separated attribute
 * value. Base for every WAI-ARIA `IDREFS` attribute.
 */
export abstract class IdListState extends State<IdListItem[], string | null> {
  protected constructor(initVal: Signal<string | null>) {
    super(
      linkedSignal(() => initVal()?.split(/\s+/).filter(Boolean) ?? []),
      (value) => {
        const ids: string[] = [];
        for (const ref of value) {
          const id = isSignal(ref) ? ref() : ref;
          if (isString(id)) ids.push(id);
        }
        return ids.length ? ids.join(' ') : null;
      },
    );
  }

  /**
   * Append a ref; returns a cleanup that removes it again. The caller owns
   * the lifetime — no `DestroyRef` auto-registration — so `add()` is safe
   * to call from inside an `effect` or any other non-injection context.
   */
  add(value: IdListItem): () => void {
    return this.pipe((current) => [...current, value], {manualCleanup: true});
  }
}
