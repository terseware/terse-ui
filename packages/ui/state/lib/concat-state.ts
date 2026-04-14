import {linkedSignal, signal} from '@angular/core';
import {State} from './state';

/**
 * Composable stack of reactive contributions merged into a single value. Each
 * `pre`/`post` registration returns a cleanup. Subclasses define `merge()` to
 * combine the resolved contributions; `pre` entries feed the start of the
 * combined list, `post` entries the end.
 */
export abstract class ConcatState<T, M = T> extends State<T> {
  readonly #pre = signal<(() => M)[]>([]);
  readonly #post = signal<(() => M)[]>([]);

  protected abstract merge(pre: M[], post: M[]): T;

  constructor() {
    super(
      linkedSignal(() => {
        const pre = this.#pre().map((s) => s());
        const post = this.#post().map((s) => s());
        return this.merge(pre, post);
      }),
    );
  }

  protected pre(fn: () => M): () => void {
    this.#pre.update((src) => [...src, fn]);
    return () => this.#pre.update((src) => src.filter((s) => s !== fn));
  }

  protected post(fn: () => M): () => void {
    this.#post.update((src) => [...src, fn]);
    return () => this.#post.update((src) => src.filter((s) => s !== fn));
  }
}
