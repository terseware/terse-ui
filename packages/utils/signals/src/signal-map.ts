import {signal, type WritableSignal} from '@angular/core';
import {notifier, type Notifier} from './notifier';

/** Tombstone used so we can distinguish "deleted" from "set to undefined." */
const REMOVED: unique symbol = Symbol('SignalMap.REMOVED');
type Tombstone = typeof REMOVED;

/**
 * A reactive Map. Each value is tracked independently, and a structural
 * notifier fires on add/delete/clear so consumers of `size`, `has`, `keys`,
 * `values`, `entries`, and iteration re-run on membership changes.
 */
export class SignalMap<K, V> implements Map<K, V> {
  readonly #storage = new Map<K, WritableSignal<V | Tombstone>>();
  readonly #structure: Notifier = notifier();

  readonly [Symbol.toStringTag] = 'SignalMap';

  constructor(initial?: Iterable<readonly [K, V]>) {
    if (initial) {
      for (const [k, v] of initial) {
        this.#storage.set(k, signal<V | Tombstone>(v));
      }
    }
  }

  get(key: K): V | undefined {
    const valueSignal = this.#storage.get(key);
    if (valueSignal) {
      const value = valueSignal();
      if (value !== REMOVED) return value as V;
    }
    this.#structure.version();
    return undefined;
  }

  set(key: K, value: V): this {
    const existing = this.#storage.get(key);
    if (existing) {
      existing.set(value);
    } else {
      this.#storage.set(key, signal<V | Tombstone>(value));
      this.#structure.bump();
    }
    return this;
  }

  setMany(entries: Iterable<readonly [K, V]>): this {
    let addedAny = false;
    for (const [key, value] of entries) {
      const existing = this.#storage.get(key);
      if (existing) {
        existing.set(value);
      } else {
        this.#storage.set(key, signal<V | Tombstone>(value));
        addedAny = true;
      }
    }
    if (addedAny) this.#structure.bump();
    return this;
  }

  delete(key: K): boolean {
    const existing = this.#storage.get(key);
    if (!existing) return false;
    existing.set(REMOVED);
    this.#storage.delete(key);
    this.#structure.bump();
    return true;
  }

  has(key: K): boolean {
    this.#structure.version();
    return this.#storage.has(key);
  }

  clear(): void {
    if (this.#storage.size === 0) return;
    for (const s of this.#storage.values()) s.set(REMOVED);
    this.#storage.clear();
    this.#structure.bump();
  }

  /**
   * Returns the existing value for `key`, or inserts `defaultValue` and
   * returns it if absent. Mirrors the TC39 proposal method.
   */
  getOrInsert(key: K, defaultValue: V): V {
    const existing = this.#storage.get(key);
    if (existing) {
      const v = existing();
      if (v !== REMOVED) return v as V;
    }
    this.#storage.set(key, signal<V | Tombstone>(defaultValue));
    this.#structure.bump();
    return defaultValue;
  }

  /**
   * Returns the existing value for `key`, or computes a default via
   * `callbackfn(key)`, inserts it, and returns it.
   */
  getOrInsertComputed(key: K, callbackfn: (key: K) => V): V {
    const existing = this.#storage.get(key);
    if (existing) {
      const v = existing();
      if (v !== REMOVED) return v as V;
    }
    const value = callbackfn(key);
    this.#storage.set(key, signal<V | Tombstone>(value));
    this.#structure.bump();
    return value;
  }

  get size(): number {
    this.#structure.version();
    return this.#storage.size;
  }

  keys(): MapIterator<K> {
    this.#structure.version();
    return this.#snapshot().keys();
  }

  values(): MapIterator<V> {
    this.#structure.version();
    return this.#snapshot().values();
  }

  entries(): MapIterator<[K, V]> {
    this.#structure.version();
    return this.#snapshot().entries();
  }

  forEach(callback: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
    this.#structure.version();
    for (const [key, s] of this.#storage.entries()) {
      const v = s();
      if (v !== REMOVED) callback.call(thisArg, v as V, key, this);
    }
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }

  /**
   * Builds a plain `Map` snapshot, reading every value signal. The snapshot's
   * iterators are native `MapIterator` instances with the full iterator-helpers
   * surface (`.map`, `.filter`, `.take`, etc.) required by the interface.
   *
   * @remarks
   * Materializing trades O(n) memory per iteration call for a spec-compliant
   * iterator type. Reactivity is unchanged — every value signal is read, so
   * consumers re-run on any value change (same granularity as before).
   */
  #snapshot(): Map<K, V> {
    const snapshot = new Map<K, V>();
    for (const [key, s] of this.#storage.entries()) {
      const v = s();
      if (v !== REMOVED) snapshot.set(key, v as V);
    }
    return snapshot;
  }
}
