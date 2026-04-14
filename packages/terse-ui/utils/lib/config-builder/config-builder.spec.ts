import {
  Component,
  computed,
  Directive,
  HostAttributeToken,
  inject,
  Injectable,
  input,
  numberAttribute,
} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {configBuilder} from './config-builder';

// ---------------------------------------------------------------------------
// Realistic fixture: mirrors the Button directive pattern
// ---------------------------------------------------------------------------

interface WidgetOpts {
  disabled: boolean;
  size: number;
  role: string | null;
  variant: string;
}

const [provideWidgetOpts, injectWidgetOpts] = configBuilder<WidgetOpts>('Widget', () => ({
  disabled: false,
  size: numberAttribute(inject(new HostAttributeToken('size'), {optional: true}) ?? 16, 16),
  role: inject(new HostAttributeToken('role'), {optional: true}),
  variant: 'solid',
}));

@Directive({
  selector: '[tWidget]',
  host: {
    '[attr.role]': 'roleAttr()',
    '[attr.data-size]': 'sizeAttr()',
  },
  exportAs: 'tWidget',
})
class Widget {
  readonly #opts = injectWidgetOpts();

  readonly size = input(this.#opts.size, {
    transform: (v: unknown) => numberAttribute(v, this.#opts.size),
  });

  readonly role = input(this.#opts.role);

  protected readonly roleAttr = computed(() => this.role() ?? 'button');
  protected readonly sizeAttr = computed(() => `${this.size()}`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('configBuilder', () => {
  describe('returns [provideOpts, injectOpts]', () => {
    it('should return a tuple of two functions', () => {
      const result = configBuilder('Test', {value: 1});
      expect(result).toHaveLength(2);
      expect(typeof result[0]).toBe('function');
      expect(typeof result[1]).toBe('function');
    });
  });

  // ---- directive-level tests (realistic injection context) ----

  describe('directive with injection-context factory defaults', () => {
    it('should resolve defaults when no opts is provided', () => {
      @Component({
        selector: 'test-host',
        imports: [Widget],
        template: `<div tWidget></div>`,
      })
      class TestHost {}

      const fixture = TestBed.createComponent(TestHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement.querySelector('[tWidget]');
      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('data-size')).toBe('16');
    });

    it('should read host attributes through the default opts factory', () => {
      @Component({
        selector: 'test-host',
        imports: [Widget],
        template: `<div role="tab" size="24" tWidget></div>`,
      })
      class TestHost {}

      const fixture = TestBed.createComponent(TestHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement.querySelector('[tWidget]');
      expect(el.getAttribute('role')).toBe('tab');
      expect(el.getAttribute('data-size')).toBe('24');
    });

    it('should coerce host attribute values via numberAttribute', () => {
      @Component({
        selector: 'test-host',
        imports: [Widget],
        template: `<div size="32" tWidget></div>`,
      })
      class TestHost {}

      const fixture = TestBed.createComponent(TestHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement.querySelector('[tWidget]');
      expect(el.getAttribute('data-size')).toBe('32');
    });
  });

  describe('provideOpts at component level (plain object)', () => {
    it('should deep merge a partial override into the default opts', () => {
      @Component({
        selector: 'test-host',
        imports: [Widget],
        template: `<div tWidget></div>`,
        providers: [provideWidgetOpts({size: 48})],
      })
      class TestHost {}

      const fixture = TestBed.createComponent(TestHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement.querySelector('[tWidget]');
      expect(el.getAttribute('data-size')).toBe('48');
      expect(el.getAttribute('role')).toBe('button');
    });

    it('should override multiple fields at once', () => {
      @Component({
        selector: 'test-host',
        imports: [Widget],
        template: `<div tWidget></div>`,
        providers: [provideWidgetOpts({size: 64, variant: 'outline'})],
      })
      class TestHost {}

      const fixture = TestBed.createComponent(TestHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement.querySelector('[tWidget]');
      expect(el.getAttribute('data-size')).toBe('64');
    });
  });

  describe('provideOpts at component level (factory function)', () => {
    it('should accept a factory that returns a partial opts', () => {
      @Component({
        selector: 'test-host',
        imports: [Widget],
        template: `<div tWidget></div>`,
        providers: [provideWidgetOpts(() => ({size: 20}))],
      })
      class TestHost {}

      const fixture = TestBed.createComponent(TestHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement.querySelector('[tWidget]');
      expect(el.getAttribute('data-size')).toBe('20');
    });

    it('should allow factory functions to use inject()', () => {
      @Injectable({providedIn: 'root'})
      class ThemeService {
        readonly defaultSize = 28;
      }

      @Component({
        selector: 'test-host',
        imports: [Widget],
        template: `<div tWidget></div>`,
        providers: [provideWidgetOpts(() => ({size: inject(ThemeService).defaultSize}))],
      })
      class TestHost {}

      const fixture = TestBed.createComponent(TestHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement.querySelector('[tWidget]');
      expect(el.getAttribute('data-size')).toBe('28');
    });
  });

  describe('multiple providers (multi token)', () => {
    it('should accumulate contributions from multiple provideOpts calls', () => {
      @Component({
        selector: 'test-host',
        imports: [Widget],
        template: `<div tWidget></div>`,
        providers: [provideWidgetOpts({size: 48}), provideWidgetOpts({variant: 'ghost'})],
      })
      class TestHost {}

      const fixture = TestBed.createComponent(TestHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement.querySelector('[tWidget]');
      expect(el.getAttribute('data-size')).toBe('48');
    });
  });

  describe('hierarchical DI', () => {
    it('should allow component-level providers to shadow module-level', () => {
      @Component({
        selector: 'test-host',
        imports: [Widget],
        template: `<div tWidget></div>`,
        providers: [provideWidgetOpts({size: 12})],
      })
      class TestHost {}

      TestBed.configureTestingModule({
        imports: [TestHost],
        providers: [provideWidgetOpts({size: 64})],
      });

      const fixture = TestBed.createComponent(TestHost);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement.querySelector('[tWidget]');
      expect(el.getAttribute('data-size')).toBe('12');
    });
  });

  // ---- service-level tests (deep merge semantics) ----

  describe('deep merge semantics', () => {
    interface SimpleOpts {
      color: string;
      count: number;
      nested: {enabled: boolean; label: string; fn: () => number};
    }

    const [provideSimple, injectSimple] = configBuilder<SimpleOpts>('Simple', () => ({
      color: 'red',
      count: 10,
      nested: {enabled: false, label: 'default', fn: () => 1},
    }));

    @Injectable({providedIn: 'root'})
    class SimpleService {
      readonly opts = injectSimple();
    }

    it('should return defaults when no providers are configured', () => {
      TestBed.configureTestingModule({});
      const service = TestBed.inject(SimpleService);

      expect(service.opts).toEqual({
        color: 'red',
        count: 10,
        nested: {enabled: false, label: 'default', fn: expect.any(Function)},
      });
    });

    it('should deep merge a partial override', () => {
      TestBed.configureTestingModule({
        providers: [provideSimple({color: 'blue'})],
      });
      const service = TestBed.inject(SimpleService);

      expect(service.opts).toEqual({
        color: 'blue',
        count: 10,
        nested: {enabled: false, label: 'default', fn: expect.any(Function)},
      });
    });

    it('should deep merge nested partial overrides', () => {
      TestBed.configureTestingModule({
        providers: [provideSimple({nested: {enabled: true}})],
      });
      const service = TestBed.inject(SimpleService);

      expect(service.opts.nested).toEqual({
        enabled: true,
        label: 'default',
        fn: expect.any(Function),
      });
    });

    it('should override multiple fields at once', () => {
      TestBed.configureTestingModule({
        providers: [provideSimple({color: 'green', count: 42, nested: {label: 'custom'}})],
      });
      const service = TestBed.inject(SimpleService);

      expect(service.opts).toEqual({
        color: 'green',
        count: 42,
        nested: {enabled: false, label: 'custom', fn: expect.any(Function)},
      });
    });

    it('should accept a factory function that returns a partial opts', () => {
      TestBed.configureTestingModule({
        providers: [provideSimple(() => ({count: 99}))],
      });
      const service = TestBed.inject(SimpleService);

      expect(service.opts.count).toBe(99);
      expect(service.opts.color).toBe('red');
    });

    it('should allow factory functions to use inject()', () => {
      @Injectable({providedIn: 'root'})
      class ColorService {
        readonly color = 'purple';
      }

      TestBed.configureTestingModule({
        providers: [provideSimple(() => ({color: inject(ColorService).color}))],
      });
      const service = TestBed.inject(SimpleService);

      expect(service.opts.color).toBe('purple');
    });

    it('should merge function values', () => {
      TestBed.configureTestingModule({
        providers: [provideSimple({nested: {fn: () => 2}})],
      });
      const service = TestBed.inject(SimpleService);
      expect(service.opts.nested.fn()).toBe(2);
    });
  });

  describe('default opts as a plain object', () => {
    it('should work with a plain object default', () => {
      const [, injectPlain] = configBuilder('Plain', {x: 1, y: 'hello'});

      @Injectable({providedIn: 'root'})
      class PlainService {
        readonly opts = injectPlain();
      }

      TestBed.configureTestingModule({});
      const service = TestBed.inject(PlainService);
      expect(service.opts).toEqual({x: 1, y: 'hello'});
    });
  });

  describe('default opts as a factory function', () => {
    it('should accept a factory function as the default opts', () => {
      const [, injectFactoryOpts] = configBuilder('Factory', () => ({value: 'from-factory'}));

      @Injectable({providedIn: 'root'})
      class FactoryService {
        readonly opts = injectFactoryOpts();
      }

      TestBed.configureTestingModule({});
      const service = TestBed.inject(FactoryService);
      expect(service.opts).toEqual({value: 'from-factory'});
    });
  });
});
