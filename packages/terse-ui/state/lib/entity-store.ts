import {deepMerge, type DeepPartial} from '@terse-ui/core/utils';
import {SignalMap} from 'ngxtension/collections';

export class EntityStore<T extends object, Id extends PropertyKey = string> {
  readonly #entities = new SignalMap<Id, T>();

  get entities(): Record<Id, T> {
    return Object.fromEntries(this.#entities.entries()) as Record<Id, T>;
  }

  get entries(): IterableIterator<[Id, T]> {
    return this.#entities.entries();
  }

  get values(): IterableIterator<T> {
    return this.#entities.values();
  }

  get list(): T[] {
    return Array.from(this.#entities.values());
  }

  get ids(): IterableIterator<Id> {
    return this.#entities.keys();
  }

  get idsList(): Id[] {
    return Array.from(this.#entities.keys());
  }

  get size(): number {
    return this.#entities.size;
  }

  constructor(readonly selectId: (entity: T) => Id) {}

  has(id: Id): boolean {
    return this.#entities.has(id);
  }

  get(id: Id): T | undefined {
    return this.#entities.get(id);
  }

  add(entity: T): boolean {
    const id = this.selectId(entity);
    if (this.#entities.has(id)) return false;
    this.#entities.set(id, entity);
    return true;
  }

  upsert(entity: T): boolean {
    const id = this.selectId(entity);
    if (this.#entities.has(id)) return this.update(id, () => entity);
    return this.add(entity);
  }

  update(id: Id, entity: (entity: T) => Partial<T>): boolean {
    const existing = this.#entities.get(id);
    if (!existing) return false;
    this.#entities.set(id, {...existing, ...entity(existing)});
    return true;
  }

  patch(id: Id, patch: DeepPartial<T>): boolean {
    const existing = this.#entities.get(id);
    if (!existing) return false;
    this.#entities.set(id, deepMerge(existing, patch));
    return true;
  }

  remove(id: Id): boolean {
    return this.#entities.delete(id);
  }

  removeAll(): void {
    this.#entities.clear();
  }

  setAll(entities: T[]): void {
    this.#entities.clear();
    for (const entity of entities) {
      this.#entities.set(this.selectId(entity), entity);
    }
  }
}
