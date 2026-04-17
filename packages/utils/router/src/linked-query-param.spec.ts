import {Component, inject, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, provideRouter} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {linkedQueryParam} from './linked-query-param';

@Component({template: ``})
class SearchComponent {
  readonly route = inject(ActivatedRoute);

  readonly defaultBehavior = linkedQueryParam({
    key: 'defaultBehavior',
    parse: (x) => x,
    stringify: (x) => x,
  });

  readonly defaultBehaviorWithDefault = linkedQueryParam({
    key: 'defaultBehaviorWithDefault',
    parse: (x) => x ?? 'default',
    stringify: (x) => x,
  });

  readonly parseBehavior = linkedQueryParam({
    key: 'parseBehavior',
    parse: (x: string | null) => parseInt(x ?? '0', 10),
    stringify: (x) => x.toString(),
  });

  readonly booleanParam = linkedQueryParam({
    key: 'enabled',
    parse: (x) => x === 'true',
    stringify: (x) => (x ? 'true' : null),
  });

  readonly customEqual = linkedQueryParam({
    key: 'custom',
    parse: (x) => x ?? '',
    stringify: (x) => x,
    equal: (a, b) => a.toLowerCase() === b.toLowerCase(),
  });

  readonly replaceUrlParam = linkedQueryParam({
    key: 'replaced',
    parse: (x) => x,
    stringify: (x) => x,
    replaceUrl: true,
  });

  readonly dynamicKey = signal('keyA');
  readonly dynamicParam = linkedQueryParam({
    key: this.dynamicKey,
    parse: (x) => x,
    stringify: (x) => x,
  });

  readonly undefinedKey = linkedQueryParam({
    key: undefined,
    parse: (x) => x ?? 'fallback',
    stringify: (x) => x,
  });
}

describe(linkedQueryParam.name, () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{path: 'search', component: SearchComponent}])],
    });
    harness = await RouterTestingHarness.create();
  });

  describe('read', () => {
    it('should return null when query param is absent', async () => {
      const instance = await harness.navigateByUrl('/search', SearchComponent);
      expect(instance.defaultBehavior()).toBe(null);
    });

    it('should return the default when parse provides one', async () => {
      const instance = await harness.navigateByUrl('/search', SearchComponent);
      expect(instance.defaultBehaviorWithDefault()).toBe('default');
    });

    it('should read the query param value', async () => {
      const instance = await harness.navigateByUrl(
        '/search?defaultBehavior=value',
        SearchComponent,
      );
      expect(instance.defaultBehavior()).toBe('value');
    });

    it('should react to URL changes', async () => {
      const instance = await harness.navigateByUrl('/search', SearchComponent);
      expect(instance.defaultBehavior()).toBe(null);

      await harness.navigateByUrl('/search?defaultBehavior=updated');
      expect(instance.defaultBehavior()).toBe('updated');
    });

    it('should treat key-only param as empty string', async () => {
      const instance = await harness.navigateByUrl(
        '/search?defaultBehaviorWithDefault',
        SearchComponent,
      );
      expect(instance.defaultBehaviorWithDefault()).toBe('');
    });
  });

  describe('parse', () => {
    it('should parse string to number', async () => {
      const instance = await harness.navigateByUrl('/search?parseBehavior=42', SearchComponent);
      expect(instance.parseBehavior()).toBe(42);
    });

    it('should parse string to boolean', async () => {
      const instance = await harness.navigateByUrl('/search?enabled=true', SearchComponent);
      expect(instance.booleanParam()).toBe(true);
    });

    it('should parse absent boolean param as false', async () => {
      const instance = await harness.navigateByUrl('/search', SearchComponent);
      expect(instance.booleanParam()).toBe(false);
    });

    it('should parse non-true string as false', async () => {
      const instance = await harness.navigateByUrl('/search?enabled=yes', SearchComponent);
      expect(instance.booleanParam()).toBe(false);
    });

    it('should apply parse on URL navigation changes', async () => {
      const instance = await harness.navigateByUrl('/search?parseBehavior=1', SearchComponent);
      expect(instance.parseBehavior()).toBe(1);

      await harness.navigateByUrl('/search?parseBehavior=99');
      expect(instance.parseBehavior()).toBe(99);
    });
  });

  describe('set', () => {
    it('should write value to the URL', async () => {
      const instance = await harness.navigateByUrl('/search', SearchComponent);

      instance.parseBehavior.set(7);
      expect(instance.parseBehavior()).toBe(7);
      await harness.fixture.whenStable();
      expect(instance.route.snapshot.queryParams['parseBehavior']).toBe('7');
    });

    it('should write null to remove the query param', async () => {
      const instance = await harness.navigateByUrl('/search?enabled=true', SearchComponent);
      expect(instance.booleanParam()).toBe(true);

      instance.booleanParam.set(false);
      expect(instance.booleanParam()).toBe(false);
    });

    it('should handle multiple sequential sets', async () => {
      const instance = await harness.navigateByUrl('/search', SearchComponent);

      instance.parseBehavior.set(1);
      expect(instance.parseBehavior()).toBe(1);

      instance.parseBehavior.set(2);
      expect(instance.parseBehavior()).toBe(2);

      instance.parseBehavior.set(3);
      expect(instance.parseBehavior()).toBe(3);

      await harness.fixture.whenStable();
      expect(instance.route.snapshot.queryParams['parseBehavior']).toBe('3');
    });
  });

  describe('update', () => {
    it('should apply an updater function', async () => {
      const instance = await harness.navigateByUrl('/search?parseBehavior=10', SearchComponent);
      expect(instance.parseBehavior()).toBe(10);

      instance.parseBehavior.update((v) => v + 5);
      await harness.fixture.whenStable();

      expect(instance.parseBehavior()).toBe(15);
      expect(instance.route.snapshot.queryParams['parseBehavior']).toBe('15');
    });

    it('should chain multiple updates', async () => {
      const instance = await harness.navigateByUrl('/search?parseBehavior=1', SearchComponent);

      instance.parseBehavior.update((v) => v * 10);
      await harness.fixture.whenStable();
      expect(instance.parseBehavior()).toBe(10);

      instance.parseBehavior.update((v) => v + 1);
      await harness.fixture.whenStable();
      expect(instance.parseBehavior()).toBe(11);
    });
  });

  describe('asReadonly', () => {
    it('should return a readable signal', async () => {
      const instance = await harness.navigateByUrl('/search?parseBehavior=5', SearchComponent);
      const ro = instance.parseBehavior.asReadonly();
      expect(ro()).toBe(5);
    });

    it('should track changes through readonly', async () => {
      const instance = await harness.navigateByUrl('/search?parseBehavior=1', SearchComponent);
      const ro = instance.parseBehavior.asReadonly();

      await harness.navigateByUrl('/search?parseBehavior=2', SearchComponent);
      expect(ro()).toBe(2);
    });
  });

  describe('equal', () => {
    it('should use custom equality to suppress redundant writes', async () => {
      const instance = await harness.navigateByUrl('/search?custom=hello', SearchComponent);
      expect(instance.customEqual()).toBe('hello');

      await harness.navigateByUrl('/search?custom=HELLO');
      // Custom equal treats 'hello' and 'HELLO' as equal — signal should not update.
      expect(instance.customEqual()).toBe('hello');
    });
  });

  describe('navigation extras', () => {
    it('should apply replaceUrl option', async () => {
      const instance = await harness.navigateByUrl('/search', SearchComponent);

      instance.replaceUrlParam.set('test');
      expect(instance.replaceUrlParam()).toBe('test');
      await harness.fixture.whenStable();
      expect(instance.route.snapshot.queryParams['replaced']).toBe('test');
    });
  });

  describe('undefined key', () => {
    it('should return the default value when key is undefined', async () => {
      const instance = await harness.navigateByUrl('/search', SearchComponent);
      expect(instance.undefinedKey()).toBe('fallback');
    });

    it('should not write to the URL when key is undefined', async () => {
      const instance = await harness.navigateByUrl('/search', SearchComponent);
      const before = instance.route.snapshot.queryParams;

      instance.undefinedKey.set('anything');
      await harness.fixture.whenStable();
      expect(instance.route.snapshot.queryParams).toEqual(before);
    });
  });

  describe('dynamic key', () => {
    it('should read from the current key', async () => {
      const instance = await harness.navigateByUrl('/search?keyA=fromA', SearchComponent);
      expect(instance.dynamicParam()).toBe('fromA');
    });

    it('should switch to a new key when the key signal changes', async () => {
      const instance = await harness.navigateByUrl(
        '/search?keyA=fromA&keyB=fromB',
        SearchComponent,
      );
      expect(instance.dynamicParam()).toBe('fromA');

      instance.dynamicKey.set('keyB');
      expect(instance.dynamicParam()).toBe('fromB');
    });
  });
});
