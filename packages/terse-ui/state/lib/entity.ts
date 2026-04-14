export type EntityId = string | number;
export type SelectId<T> = (entity: T) => EntityId;

export interface EntityCollection<T> {
  readonly ids: EntityId[];
  readonly entities: Record<EntityId, T>;
}

export function emptyCollection<T>(): EntityCollection<T> {
  return {ids: [], entities: {}};
}

export function addEntity<T extends {id: EntityId}>(
  collection: EntityCollection<T>,
  entity: T,
): EntityCollection<T>;
export function addEntity<T>(
  collection: EntityCollection<T>,
  entity: T,
  selectId: SelectId<T>,
): EntityCollection<T>;
export function addEntity<T>(
  collection: EntityCollection<T>,
  entity: T,
  selectId?: SelectId<T>,
): EntityCollection<T> {
  const id = selectId ? selectId(entity) : (entity as {id: EntityId}).id;
  if (id in collection.entities) return collection;
  return {
    ids: [...collection.ids, id],
    entities: {...collection.entities, [id]: entity},
  };
}

export function removeEntity<T>(
  collection: EntityCollection<T>,
  id: EntityId,
): EntityCollection<T> {
  if (!(id in collection.entities)) return collection;
  const {[id]: _, ...entities} = collection.entities;
  return {
    ids: collection.ids.filter((i) => i !== id),
    entities,
  };
}

export function updateEntity<T>(
  collection: EntityCollection<T>,
  id: EntityId,
  changes: Partial<T> | ((entity: T) => Partial<T>),
): EntityCollection<T> {
  const existing = collection.entities[id];
  if (!existing) return collection;
  const partial =
    typeof changes === 'function' ? (changes as (e: T) => Partial<T>)(existing) : changes;
  return {
    ids: collection.ids,
    entities: {...collection.entities, [id]: {...existing, ...partial}},
  };
}

export function upsertEntity<T extends {id: EntityId}>(
  collection: EntityCollection<T>,
  entity: T,
): EntityCollection<T>;
export function upsertEntity<T>(
  collection: EntityCollection<T>,
  entity: T,
  selectId: SelectId<T>,
): EntityCollection<T>;
export function upsertEntity<T>(
  collection: EntityCollection<T>,
  entity: T,
  selectId?: SelectId<T>,
): EntityCollection<T> {
  const id = selectId ? selectId(entity) : (entity as {id: EntityId}).id;
  const existing = collection.entities[id];
  return {
    ids: existing ? collection.ids : [...collection.ids, id],
    entities: {...collection.entities, [id]: existing ? {...existing, ...entity} : entity},
  };
}

export function setEntity<T extends {id: EntityId}>(
  collection: EntityCollection<T>,
  entity: T,
): EntityCollection<T>;
export function setEntity<T>(
  collection: EntityCollection<T>,
  entity: T,
  selectId: SelectId<T>,
): EntityCollection<T>;
export function setEntity<T>(
  collection: EntityCollection<T>,
  entity: T,
  selectId?: SelectId<T>,
): EntityCollection<T> {
  const id = selectId ? selectId(entity) : (entity as {id: EntityId}).id;
  const exists = id in collection.entities;
  return {
    ids: exists ? collection.ids : [...collection.ids, id],
    entities: {...collection.entities, [id]: entity},
  };
}

export function setAllEntities<T extends {id: EntityId}>(entities: T[]): EntityCollection<T>;
export function setAllEntities<T>(entities: T[], selectId: SelectId<T>): EntityCollection<T>;
export function setAllEntities<T>(entities: T[], selectId?: SelectId<T>): EntityCollection<T> {
  const result: Record<EntityId, T> = {};
  const ids: EntityId[] = [];
  for (const entity of entities) {
    const id = selectId ? selectId(entity) : (entity as {id: EntityId}).id;
    result[id] = entity;
    ids.push(id);
  }
  return {ids, entities: result};
}

export function removeAllEntities<T>(): EntityCollection<T> {
  return emptyCollection();
}
