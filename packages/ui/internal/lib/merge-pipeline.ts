import {computed, signal} from '@angular/core';

export type MergeHandler<T> = (external: Partial<T>) => Partial<T>;

export abstract class MergePipeline<T> {
  readonly #pipeline = signal<MergeHandler<T>[]>([]);

  protected readonly result = computed(() => {
    let merged = {} as Partial<T>;
    for (const fn of this.#pipeline()) merged = fn(merged);
    return merged;
  });

  pipe(fn: MergeHandler<T>, opts: {prepend?: boolean}): () => void {
    this.#pipeline.update(opts?.prepend ? (p) => [fn, ...p] : (p) => [...p, fn]);
    return () => this.#pipeline.update((p) => p.filter((x) => x !== fn));
  }
}
