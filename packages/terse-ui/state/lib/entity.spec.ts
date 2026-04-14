import {
  addEntity,
  emptyCollection,
  removeAllEntities,
  removeEntity,
  setAllEntities,
  setEntity,
  updateEntity,
  upsertEntity,
  type EntityCollection,
} from './entity';

interface Item {
  id: string;
  label: string;
  disabled: boolean;
}

const selectId = (item: Item) => item.id;

function collection(...items: Item[]): EntityCollection<Item> {
  const entities: Record<string, Item> = {};
  const ids: string[] = [];
  for (const item of items) {
    entities[item.id] = item;
    ids.push(item.id);
  }
  return {ids, entities};
}

const itemA: Item = {id: 'a', label: 'Alpha', disabled: false};
const itemB: Item = {id: 'b', label: 'Bravo', disabled: false};
const itemC: Item = {id: 'c', label: 'Charlie', disabled: true};

describe('entity', () => {
  describe('emptyCollection', () => {
    it('returns an empty collection', () => {
      const result = emptyCollection<Item>();
      expect(result).toEqual({ids: [], entities: {}});
    });
  });

  describe('addEntity', () => {
    it('adds an entity to an empty collection', () => {
      const result = addEntity(emptyCollection<Item>(), itemA, selectId);
      expect(result).toEqual(collection(itemA));
    });

    it('appends to the end of ids', () => {
      const result = addEntity(collection(itemA), itemB, selectId);
      expect(result.ids).toEqual(['a', 'b']);
      expect(result.entities['b']).toEqual(itemB);
    });

    it('is a no-op when the entity already exists', () => {
      const before = collection(itemA);
      const result = addEntity(before, itemA, selectId);
      expect(result).toBe(before);
    });

    it('skips duplicates by id, not reference', () => {
      const before = collection(itemA);
      const duplicate = {...itemA, label: 'Changed'};
      const result = addEntity(before, duplicate, selectId);
      expect(result).toBe(before);
      expect(result.entities['a'].label).toBe('Alpha');
    });
  });

  describe('removeEntity', () => {
    it('removes an entity by id', () => {
      const result = removeEntity(collection(itemA, itemB), 'a');
      expect(result).toEqual(collection(itemB));
    });

    it('is a no-op when the id does not exist', () => {
      const before = collection(itemA);
      const result = removeEntity(before, 'z');
      expect(result).toBe(before);
    });

    it('removes the last entity leaving an empty collection', () => {
      const result = removeEntity(collection(itemA), 'a');
      expect(result).toEqual({ids: [], entities: {}});
    });

    it('preserves insertion order of remaining items', () => {
      const result = removeEntity(collection(itemA, itemB, itemC), 'b');
      expect(result.ids).toEqual(['a', 'c']);
    });
  });

  describe('updateEntity', () => {
    it('partially updates an existing entity', () => {
      const result = updateEntity(collection(itemA, itemB), 'a', {label: 'Updated'});
      expect(result.entities['a']).toEqual({id: 'a', label: 'Updated', disabled: false});
      expect(result.entities['b']).toEqual(itemB);
    });

    it('accepts a function for computed changes', () => {
      const result = updateEntity(collection(itemA), 'a', (e) => ({label: `${e.label}!`}));
      expect(result.entities['a'].label).toBe('Alpha!');
    });

    it('is a no-op when the id does not exist', () => {
      const before = collection(itemA);
      const result = updateEntity(before, 'z', {label: 'nope'});
      expect(result).toBe(before);
    });

    it('preserves ids order', () => {
      const result = updateEntity(collection(itemA, itemB, itemC), 'b', {disabled: true});
      expect(result.ids).toEqual(['a', 'b', 'c']);
    });
  });

  describe('upsertEntity', () => {
    it('adds a new entity when it does not exist', () => {
      const result = upsertEntity(collection(itemA), itemB, selectId);
      expect(result.ids).toEqual(['a', 'b']);
      expect(result.entities['b']).toEqual(itemB);
    });

    it('shallow-merges into an existing entity', () => {
      const updated = {id: 'a', label: 'Updated'} as Item;
      const result = upsertEntity(collection(itemA), updated, selectId);
      expect(result.entities['a']).toEqual({id: 'a', label: 'Updated', disabled: false});
    });

    it('does not duplicate ids on merge', () => {
      const result = upsertEntity(collection(itemA), {...itemA, label: 'New'}, selectId);
      expect(result.ids).toEqual(['a']);
    });
  });

  describe('setEntity', () => {
    it('adds a new entity when it does not exist', () => {
      const result = setEntity(collection(itemA), itemB, selectId);
      expect(result.ids).toEqual(['a', 'b']);
      expect(result.entities['b']).toEqual(itemB);
    });

    it('fully replaces an existing entity', () => {
      const replacement = {id: 'a', label: 'Replaced', disabled: true};
      const result = setEntity(collection(itemA), replacement, selectId);
      expect(result.entities['a']).toEqual(replacement);
    });

    it('does not duplicate ids on replacement', () => {
      const result = setEntity(collection(itemA), {...itemA, label: 'New'}, selectId);
      expect(result.ids).toEqual(['a']);
    });
  });

  describe('setAllEntities', () => {
    it('creates a collection from an array', () => {
      const result = setAllEntities([itemA, itemB], selectId);
      expect(result).toEqual(collection(itemA, itemB));
    });

    it('results in empty collection when given empty array', () => {
      const result = setAllEntities<Item>([], selectId);
      expect(result).toEqual({ids: [], entities: {}});
    });
  });

  describe('removeAllEntities', () => {
    it('returns an empty collection', () => {
      const result = removeAllEntities<Item>();
      expect(result).toEqual({ids: [], entities: {}});
    });
  });

  describe('composition', () => {
    it('chains multiple operations sequentially', () => {
      let state: EntityCollection<Item> = emptyCollection();
      state = addEntity(state, itemA, selectId);
      state = addEntity(state, itemB, selectId);
      state = addEntity(state, itemC, selectId);
      state = removeEntity(state, 'b');
      state = updateEntity(state, 'a', {label: 'First'});

      expect(state.ids).toEqual(['a', 'c']);
      expect(state.entities['a'].label).toBe('First');
      expect(state.entities['c']).toEqual(itemC);
    });

    it('works with numeric ids', () => {
      interface NumItem {
        key: number;
        name: string;
      }

      const sel = (item: NumItem) => item.key;
      let state: EntityCollection<NumItem> = emptyCollection();
      state = addEntity(state, {key: 1, name: 'one'}, sel);
      state = addEntity(state, {key: 2, name: 'two'}, sel);
      state = removeEntity(state, 1);

      expect(state.ids).toEqual([2]);
      expect(state.entities[2]).toEqual({key: 2, name: 'two'});
    });
  });
});
