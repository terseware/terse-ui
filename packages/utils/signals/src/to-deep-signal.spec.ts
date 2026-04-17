import {computed, effect, isSignal, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {toDeepSignal} from './to-deep-signal';

describe('toDeepSignal', () => {
  describe('flat object', () => {
    it('should read the root value', () => {
      const source = signal({name: 'Alice', age: 30});
      const deep = toDeepSignal(source);
      expect(deep()).toEqual({name: 'Alice', age: 30});
    });

    it('should expose per-property signals', () => {
      const source = signal({name: 'Alice', age: 30});
      const deep = toDeepSignal(source);
      expect(deep.name()).toBe('Alice');
      expect(deep.age()).toBe(30);
    });

    it('should return signals for properties', () => {
      const source = signal({name: 'Alice'});
      const deep = toDeepSignal(source);
      expect(isSignal(deep.name)).toBe(true);
    });

    it('should memoize the underlying computed per property', () => {
      const source = signal({name: 'Alice'});
      const deep = toDeepSignal(source);

      const val1 = deep.name();
      const val2 = deep.name();
      expect(val1).toBe(val2);

      source.set({name: 'Bob'});
      expect(deep.name()).toBe('Bob');
    });
  });

  describe('reactivity', () => {
    it('should track property changes in computed', () => {
      const source = signal({name: 'Alice', age: 30});
      const deep = toDeepSignal(source);
      const name = computed(() => deep.name());

      expect(name()).toBe('Alice');

      source.set({name: 'Bob', age: 25});
      expect(name()).toBe('Bob');
    });

    it('should track root value changes', () => {
      const source = signal({x: 1});
      const deep = toDeepSignal(source);
      const x = computed(() => deep.x());

      source.set({x: 2});
      expect(x()).toBe(2);
    });

    it('should track in effects', () => {
      TestBed.runInInjectionContext(() => {
        const source = signal({count: 0});
        const deep = toDeepSignal(source);
        let effectCount = 0;

        effect(() => {
          deep.count();
          effectCount++;
        });

        TestBed.tick();
        expect(effectCount).toBe(1);

        source.set({count: 1});
        TestBed.tick();
        expect(effectCount).toBe(2);
      });
    });
  });

  describe('nested objects', () => {
    it('should recurse into nested records', () => {
      const source = signal({user: {name: 'Alice', address: {city: 'NYC'}}});
      const deep = toDeepSignal(source);

      expect(deep.user.name()).toBe('Alice');
      expect(deep.user.address.city()).toBe('NYC');
    });

    it('should track nested property changes', () => {
      const source = signal({user: {name: 'Alice'}});
      const deep = toDeepSignal(source);
      const name = computed(() => deep.user.name());

      expect(name()).toBe('Alice');

      source.set({user: {name: 'Bob'}});
      expect(name()).toBe('Bob');
    });
  });

  describe('non-record values', () => {
    it('should not recurse into arrays', () => {
      const source = signal({items: [1, 2, 3]});
      const deep = toDeepSignal(source);

      expect(deep.items()).toEqual([1, 2, 3]);
      expect(isSignal(deep.items)).toBe(true);
    });

    it('should not recurse into Date', () => {
      const now = new Date();
      const source = signal({created: now});
      const deep = toDeepSignal(source);
      expect(deep.created()).toBe(now);
    });

    it('should not recurse into Map', () => {
      const m = new Map([['a', 1]]);
      const source = signal({data: m});
      const deep = toDeepSignal(source);
      expect(deep.data()).toBe(m);
    });

    it('should not recurse into Set', () => {
      const s = new Set([1, 2]);
      const source = signal({data: s});
      const deep = toDeepSignal(source);
      expect(deep.data()).toBe(s);
    });

    it('should pass through primitive signals', () => {
      const source = signal(42);
      const deep = toDeepSignal(source);
      expect(deep()).toBe(42);
    });

    it('should pass through null signal', () => {
      const source = signal(null);
      const deep = toDeepSignal(source);
      expect(deep()).toBe(null);
    });
  });

  describe('stale cleanup', () => {
    it('should clean up signals for removed properties', () => {
      const source = signal<Record<string, number>>({a: 1, b: 2});
      const deep = toDeepSignal(source) as any;

      expect(deep.a()).toBe(1);
      expect(deep.b()).toBe(2);

      source.set({a: 10});

      expect(deep.a()).toBe(10);
      expect(deep.b?.()).toBeUndefined();
    });
  });

  describe('with computed source', () => {
    it('should work with a computed signal', () => {
      const first = signal('Alice');
      const last = signal('Smith');
      const full = computed(() => ({first: first(), last: last()}));
      const deep = toDeepSignal(full);

      expect(deep.first()).toBe('Alice');
      expect(deep.last()).toBe('Smith');

      first.set('Bob');
      expect(deep.first()).toBe('Bob');
    });
  });

  describe('has trap', () => {
    it('should report existing properties', () => {
      const source = signal({name: 'Alice'});
      const deep = toDeepSignal(source);
      expect('name' in deep).toBe(true);
    });

    it('should report missing properties', () => {
      const source = signal({name: 'Alice'});
      const deep = toDeepSignal(source);
      expect('missing' in deep).toBe(false);
    });
  });
});
