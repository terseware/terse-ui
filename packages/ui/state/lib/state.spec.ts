import {
  computed,
  Directive,
  EnvironmentInjector,
  runInInjectionContext,
  signal,
  type WritableSignal,
} from '@angular/core';
import {render} from '@testing-library/angular';
import {State} from './state';

// Concrete subclass with protected access (typical atom pattern)
@Directive({
  selector: '[testSource]',
  exportAs: 'testSource',
})
class TestSource extends State<number> {
  constructor() {
    super(signal(0));
  }
}

// Concrete subclass with public access
@Directive({
  selector: '[testConvertSource]',
  exportAs: 'testConvertSource',
})
class TestConvertSource extends State<string, string[]> {
  constructor() {
    super(signal('initial'), (c) => c.split(' '));
  }
}

describe('Source', () => {
  describe('callable as function', () => {
    it('should be callable and return the signal value', async () => {
      const {fixture} = await render(`<div testSource></div>`, {
        imports: [TestSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestSource);

      expect(source()).toBe(0);
    });

    it('should be an instance of Source', async () => {
      const {fixture} = await render(`<div testSource></div>`, {
        imports: [TestSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestSource);

      expect(source).toBeInstanceOf(TestSource);
      expect(source).toBeInstanceOf(State);
    });
  });

  describe('value', () => {
    it('should return current value with tracked=true (default)', async () => {
      const {fixture} = await render(`<div testSource></div>`, {
        imports: [TestSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestSource);

      expect(source.value()).toBe(0);
    });

    it('should return current value with tracked=false (untracked)', async () => {
      const {fixture} = await render(`<div testSource></div>`, {
        imports: [TestSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestSource);

      expect(source.value(false)).toBe(0);
    });
  });

  describe('asReadonly', () => {
    it('should return a readonly signal', async () => {
      const {fixture} = await render(`<div testSource></div>`, {
        imports: [TestSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestSource);

      const readonly = source.asReadonly();
      expect(readonly()).toBe(0);

      source['set'](42);
      expect(readonly()).toBe(42);
    });
  });

  describe('set', () => {
    it('should update the value', async () => {
      const {fixture} = await render(`<div testSource></div>`, {
        imports: [TestSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestSource);

      source['set'](99);
      expect(source()).toBe(99);
    });
  });

  describe('update', () => {
    it('should update the value using a function', async () => {
      const {fixture} = await render(`<div testSource></div>`, {
        imports: [TestSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestSource);

      source['set'](10);
      source['update']((v) => v + 5);
      expect(source()).toBe(15);
    });
  });

  describe('bindSource', () => {
    it('should reactively bind from an external signal', async () => {
      const external: WritableSignal<number> = signal(100);

      const {fixture} = await render(`<div testSource></div>`, {
        imports: [TestSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestSource);
      const envInjector = fixture.debugElement.children[0].injector.get(EnvironmentInjector);

      runInInjectionContext(envInjector, () => source.pipe(computed(() => external())));
      fixture.detectChanges();

      expect(source()).toBe(100);

      external.set(200);
      fixture.detectChanges();

      expect(source()).toBe(200);
    });

    it('should not update when binding returns undefined', async () => {
      const external: WritableSignal<number> = signal(0);

      const {fixture} = await render(`<div testSource></div>`, {
        imports: [TestSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestSource);
      const envInjector = fixture.debugElement.children[0].injector.get(EnvironmentInjector);

      source['set'](42);
      runInInjectionContext(envInjector, () =>
        source.pipe((u) => (external() > 0 ? external() : u)),
      );
      fixture.detectChanges();

      // external is 0, binding returns undefined — value unchanged
      expect(source()).toBe(42);

      external.set(99);
      fixture.detectChanges();

      expect(source()).toBe(99);
    });
  });

  describe('ConvertSource', () => {
    it('should expose set publicly', async () => {
      const {fixture} = await render(`<div testConvertSource></div>`, {
        imports: [TestConvertSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestConvertSource);

      expect(source()).toEqual(['initial']);
      source['set']('updated');
      expect(source()).toEqual(['updated']);
    });

    it('should expose update publicly', async () => {
      const {fixture} = await render(`<div testConvertSource></div>`, {
        imports: [TestConvertSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestConvertSource);

      source['update']((v) => v + ' !');
      expect(source()).toEqual(['initial', '!']);
    });

    it('should expose bindSource publicly', async () => {
      const external = signal('bound');

      const {fixture} = await render(`<div testConvertSource></div>`, {
        imports: [TestConvertSource],
      });
      const source = fixture.debugElement.children[0].injector.get(TestConvertSource);
      const envInjector = fixture.debugElement.children[0].injector.get(EnvironmentInjector);

      runInInjectionContext(envInjector, () => source.pipe(computed(() => external())));
      fixture.detectChanges();

      expect(source()).toEqual(['bound']);
    });
  });
});
