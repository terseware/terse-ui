import {deepMerge} from './deep-merge';

describe('deepMerge', () => {
  it('shallow-merges top-level primitives', () => {
    expect(deepMerge({a: 1, b: 2}, {b: 3})).toEqual({a: 1, b: 3});
  });

  it('deep-merges nested objects', () => {
    const target = {nest: {a: 1, b: 2}};
    const patch = {nest: {b: 3, c: 4}};
    expect(deepMerge(target, patch)).toEqual({nest: {a: 1, b: 3, c: 4}});
  });

  it('deep-merges multiply-nested objects', () => {
    const target = {a: {b: {c: 1, d: 2}}};
    const patch = {a: {b: {d: 3, e: 4}}};
    expect(deepMerge(target, patch)).toEqual({a: {b: {c: 1, d: 3, e: 4}}});
  });

  it('replaces arrays instead of merging them', () => {
    const target = {tags: ['a', 'b']};
    const patch = {tags: ['c']};
    expect(deepMerge(target, patch)).toEqual({tags: ['c']});
  });

  it('replaces a nested object with null', () => {
    const target = {a: {b: 1}};
    const patch = {a: null};
    expect(deepMerge(target, patch as never)).toEqual({a: null});
  });

  it('replaces a primitive with an object', () => {
    const target = {a: 'hello'} as Record<string, unknown>;
    const patch = {a: {nested: true}};
    expect(deepMerge(target, patch)).toEqual({a: {nested: true}});
  });

  it('replaces an object with a primitive', () => {
    const target = {a: {nested: true}} as Record<string, unknown>;
    const patch = {a: 42};
    expect(deepMerge(target, patch)).toEqual({a: 42});
  });

  it('preserves Date instances', () => {
    const date = new Date('2025-01-01');
    const result = deepMerge({d: new Date('2020-01-01')}, {d: date});
    expect(result.d).toBe(date);
    expect(result.d instanceof Date).toBe(true);
  });

  it('does not mutate the target', () => {
    const target = {a: {b: 1}};
    const original = {a: {b: 1}};
    deepMerge(target, {a: {b: 2}});
    expect(target).toEqual(original);
  });

  it('does not mutate the patch', () => {
    const patch = {a: {b: 2}};
    const original = {a: {b: 2}};
    deepMerge({a: {b: 1}}, patch);
    expect(patch).toEqual(original);
  });

  it('handles an empty patch', () => {
    const target = {a: 1, b: {c: 2}};
    expect(deepMerge(target, {})).toEqual({a: 1, b: {c: 2}});
  });

  it('safeguards against prototype pollution', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    const result: any = deepMerge({}, malicious);
    expect(({} as any).polluted).toBeUndefined();
    expect(result.__proto__?.polluted).toBeUndefined();
  });

  it('skips constructor and prototype keys', () => {
    const patch = {constructor: 'bad', prototype: 'bad'} as any;
    const result: any = deepMerge({a: 1}, patch);
    expect(result.a).toBe(1);
    expect(result.constructor).not.toBe('bad');
    expect(result.prototype).not.toBe('bad');
  });

  it('handles undefined patch values by setting them', () => {
    const result = deepMerge({a: 1}, {a: undefined} as any);
    expect(result.a).toBeUndefined();
  });

  it('shallow-merges top-level primitives', () => {
    expect(deepMerge({a: 1, b: 2}, {b: 3})).toEqual({a: 1, b: 3});
  });

  it('deep-merges nested objects', () => {
    expect(deepMerge({nest: {a: 1, b: 2}}, {nest: {b: 3, c: 4} as never})).toEqual({
      nest: {a: 1, b: 3, c: 4},
    });
  });

  it('deep-merges multiply-nested objects', () => {
    expect(deepMerge({a: {b: {c: 1, d: 2}}}, {a: {b: {d: 3, e: 4} as never}})).toEqual({
      a: {b: {c: 1, d: 3, e: 4}},
    });
  });

  it('applies multiple patches left to right', () => {
    expect(deepMerge({a: 1, b: 2, c: 3}, {a: 10}, {b: 20})).toEqual({a: 10, b: 20, c: 3});
  });

  it('applies multiple nested patches left to right', () => {
    expect(deepMerge({nest: {a: 1, b: 2, c: 3}}, {nest: {a: 10}}, {nest: {b: 20}})).toEqual({
      nest: {a: 10, b: 20, c: 3},
    });
  });

  it('last patch wins for the same key', () => {
    expect(deepMerge({a: 1}, {a: 2}, {a: 3})).toEqual({a: 3});
  });

  it('replaces arrays instead of merging them', () => {
    expect(deepMerge({tags: ['a', 'b']}, {tags: ['c']})).toEqual({tags: ['c']});
  });

  it('replaces a nested object with null', () => {
    expect(deepMerge({a: {b: 1}}, {a: null} as never)).toEqual({a: null});
  });

  it('replaces a primitive with an object', () => {
    const result = deepMerge({a: 'hello'} as Record<string, unknown>, {a: {nested: true}});
    expect(result).toEqual({a: {nested: true}});
  });

  it('replaces an object with a primitive', () => {
    const result = deepMerge({a: {nested: true}} as Record<string, unknown>, {a: 42});
    expect(result).toEqual({a: 42});
  });

  it('preserves Date instances', () => {
    const date = new Date('2025-01-01');
    const result = deepMerge({d: new Date('2020-01-01')}, {d: date});
    expect(result.d).toBe(date);
    expect(result.d instanceof Date).toBe(true);
  });

  it('returns a copy when no patches are provided', () => {
    const target = {a: {b: 1}};
    const result = deepMerge(target);
    expect(result).toEqual(target);
    expect(result).not.toBe(target);
  });

  it('does not mutate the target', () => {
    const target = {a: {b: 1}};
    deepMerge(target, {a: {b: 2}});
    expect(target).toEqual({a: {b: 1}});
  });

  it('does not mutate any patch', () => {
    const p1 = {a: {b: 2}};
    const p2 = {a: {c: 3}};
    deepMerge({a: {b: 1}}, p1, p2 as never);
    expect(p1).toEqual({a: {b: 2}});
    expect(p2).toEqual({a: {c: 3}});
  });

  it('handles an empty patch', () => {
    expect(deepMerge({a: 1, b: {c: 2}}, {})).toEqual({a: 1, b: {c: 2}});
  });

  it('safeguards against prototype pollution', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    deepMerge({}, malicious);
    expect(({} as any).polluted).toBeUndefined();
  });

  it('skips constructor and prototype keys', () => {
    const result: any = deepMerge({a: 1}, {constructor: 'bad', prototype: 'bad'} as any);
    expect(result.a).toBe(1);
    expect(result.constructor).not.toBe('bad');
    expect(result.prototype).not.toBe('bad');
  });
});
