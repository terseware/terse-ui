import {SignalMap} from './signal-map';

const PRESENT: unique symbol = Symbol('SignalSet.PRESENT');
type Present = typeof PRESENT;

export class SignalSet<T> implements Set<T> {
  readonly #map = new SignalMap<T, Present>();

  readonly [Symbol.toStringTag] = 'SignalSet';

  constructor(values?: Iterable<T> | null) {
    if (values) {
      for (const value of values) {
        this.#map.set(value, PRESENT);
      }
    }
  }

  has(value: T): boolean {
    return this.#map.has(value);
  }

  add(value: T): this {
    this.#map.set(value, PRESENT);
    return this;
  }

  delete(value: T): boolean {
    return this.#map.delete(value);
  }

  clear(): void {
    this.#map.clear();
  }

  get size(): number {
    return this.#map.size;
  }

  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: unknown): void {
    this.#map.forEach((_, key) => callbackfn.call(thisArg, key, key, this));
  }

  keys(): SetIterator<T> {
    return this.#snapshot().keys();
  }

  values(): SetIterator<T> {
    return this.#snapshot().values();
  }

  entries(): SetIterator<[T, T]> {
    return this.#snapshot().entries();
  }

  [Symbol.iterator](): SetIterator<T> {
    return this.values();
  }

  // --- ES2025 set-algebra methods ---
  //
  // These return plain `Set<T>` snapshots at call time, matching the spec.
  // A "live reactive union" is a different abstraction — build it with
  // `computed(() => new SignalSet([...a, ...b]))` or similar.

  union<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return this.#snapshot().union(other);
  }

  intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
    return this.#snapshot().intersection(other);
  }

  difference<U>(other: ReadonlySetLike<U>): Set<T> {
    return this.#snapshot().difference(other);
  }

  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return this.#snapshot().symmetricDifference(other);
  }

  isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
    return this.#snapshot().isSubsetOf(other);
  }

  isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
    return this.#snapshot().isSupersetOf(other);
  }

  isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
    return this.#snapshot().isDisjointFrom(other);
  }

  /**
   * Materializes a plain `Set` snapshot for spec-compliant iterator types
   * and set-algebra delegation. Reads every key (tracks structure).
   *
   * @remarks
   * Set iteration is naturally structure-only — values are the keys, so
   * there are no per-value signals to track. This makes `SignalSet`
   * iteration strictly cheaper than `SignalMap` iteration.
   */
  #snapshot(): Set<T> {
    const snapshot = new Set<T>();
    for (const key of this.#map.keys()) {
      snapshot.add(key);
    }
    return snapshot;
  }
}
