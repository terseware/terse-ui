import {computed, effect, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {computedPrevious} from './computed-previous';

describe('computedPrevious', () => {
  describe('basic behavior', () => {
    it('should return the current value on first read', () => {
      const source = signal(1);
      const prev = computedPrevious(() => source());
      expect(prev()).toBe(1);
    });

    it('should return the previous value after a change', () => {
      const source = signal(1);
      const prev = computedPrevious(() => source());

      expect(prev()).toBe(1);

      source.set(2);
      expect(prev()).toBe(1);

      source.set(3);
      expect(prev()).toBe(2);
    });

    it('should track multiple changes', () => {
      const source = signal('a');
      const prev = computedPrevious(() => source());

      expect(prev()).toBe('a');

      source.set('b');
      expect(prev()).toBe('a');

      source.set('c');
      expect(prev()).toBe('b');

      source.set('d');
      expect(prev()).toBe('c');
    });
  });

  describe('same-value behavior', () => {
    it('should not update when source is set to the same value', () => {
      const source = signal(1);
      const prev = computedPrevious(() => source());

      expect(prev()).toBe(1);

      source.set(2);
      expect(prev()).toBe(1);

      source.set(2);
      expect(prev()).toBe(1);
    });

    it('should reflect current value when first read happens after source changed', () => {
      const source = signal(1);
      const prev = computedPrevious(() => source());

      source.set(2);
      // First read after change — linkedSignal has no previous, returns current.
      expect(prev()).toBe(2);
    });
  });

  describe('reactive contexts', () => {
    it('should work inside a computed', () => {
      const source = signal(10);
      const prev = computedPrevious(() => source());
      const label = computed(() => `prev: ${prev()}, curr: ${source()}`);

      expect(label()).toBe('prev: 10, curr: 10');

      source.set(20);
      expect(label()).toBe('prev: 10, curr: 20');

      source.set(30);
      expect(label()).toBe('prev: 20, curr: 30');
    });

    it('should work inside an effect', () => {
      TestBed.runInInjectionContext(() => {
        const source = signal(0);
        const prev = computedPrevious(() => source());
        const values: number[] = [];

        effect(() => {
          values.push(prev());
        });

        TestBed.tick();
        expect(values).toEqual([0]);

        // 0 → 1: prev output stays 0 (same as before), effect may not re-run
        source.set(1);
        TestBed.tick();

        // 1 → 2: prev output changes from 0 to 1, effect re-runs
        source.set(2);
        TestBed.tick();

        // 2 → 3: prev output changes from 1 to 2, effect re-runs
        source.set(3);
        TestBed.tick();

        expect(values).toContain(0);
        expect(values).toContain(1);
        expect(values).toContain(2);
      });
    });
  });

  describe('derived source', () => {
    it('should track a computation, not just a raw signal', () => {
      const a = signal(1);
      const b = signal(10);
      const prev = computedPrevious(() => a() + b());

      expect(prev()).toBe(11);

      a.set(2);
      expect(prev()).toBe(11);

      b.set(20);
      expect(prev()).toBe(12);
    });
  });

  describe('read-only', () => {
    it('should not expose set or update', () => {
      const source = signal(1);
      const prev = computedPrevious(() => source());

      expect('set' in prev).toBe(false);
      expect('update' in prev).toBe(false);
    });
  });
});
