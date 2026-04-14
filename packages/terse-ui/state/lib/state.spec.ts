import {computed, Directive, inject, signal} from '@angular/core';
import {render} from '@testing-library/angular';
import {State} from './state';

// ---------------------------------------------------------------------------
// Test subclasses — lightweight State subclasses that mirror real usage
// (Focus, Hover) without pulling in the full library.
// ---------------------------------------------------------------------------

interface CounterState {
  count: number;
  label: string;
}

@Directive()
class TestCounter extends State<CounterState> {
  constructor() {
    super({count: 0, label: 'default'});
  }

  increment(): void {
    this.patchState({count: this.innerState().count + 1});
  }

  setLabel(label: string): void {
    this.patchState({label});
  }
}

@Directive()
class TestPrimitive extends State<number> {
  constructor() {
    super(0);
  }

  setValue(n: number): void {
    this.patchState(n as never);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('State', () => {
  describe('initial value', () => {
    it('exposes the initial value via state', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestCounter]})
      class Host {
        counter = inject(TestCounter);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.counter.state()).toEqual({count: 0, label: 'default'});
    });

    it('works with primitive state', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestPrimitive]})
      class Host {
        prim = inject(TestPrimitive);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.prim.state()).toBe(0);
    });

    it('accepts null as initial value', async () => {
      @Directive()
      class NullState extends State<string | null> {
        constructor() {
          super(null);
        }
      }

      @Directive({selector: '[test]', hostDirectives: [NullState]})
      class Host {
        s = inject(NullState);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.s.state()).toBeNull();
    });
  });

  describe('signal source tracking', () => {
    it('tracks a signal input reactively via linkedSignal', async () => {
      const source = signal({count: 10, label: 'from-signal'});

      @Directive()
      class ReactiveCounter extends State<CounterState> {
        constructor() {
          super(computed(() => source()));
        }
      }

      @Directive({selector: '[test]', hostDirectives: [ReactiveCounter]})
      class Host {
        counter = inject(ReactiveCounter);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.counter.state()).toEqual({count: 10, label: 'from-signal'});

      source.set({count: 20, label: 'updated'});
      fixture.detectChanges();
      expect(host.counter.state()).toEqual({count: 20, label: 'updated'});
    });

    it('tracks a primitive signal source reactively', async () => {
      const source = signal(42);

      @Directive()
      class ReactiveNumber extends State<number> {
        constructor() {
          super(computed(() => source()));
        }
      }

      @Directive({selector: '[test]', hostDirectives: [ReactiveNumber]})
      class Host {
        num = inject(ReactiveNumber);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.num.state()).toBe(42);

      source.set(99);
      fixture.detectChanges();
      expect(host.num.state()).toBe(99);
    });
  });

  describe('patchState', () => {
    it('deep-merges a partial update into object state', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestCounter]})
      class Host {
        counter = inject(TestCounter);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      host.counter.setLabel('patched');
      fixture.detectChanges();
      expect(host.counter.state()).toEqual({count: 0, label: 'patched'});
    });

    it('preserves unpatched fields', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestCounter]})
      class Host {
        counter = inject(TestCounter);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      host.counter.increment();
      fixture.detectChanges();
      expect(host.counter.state()).toEqual({count: 1, label: 'default'});
    });

    it('supports sequential patches', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestCounter]})
      class Host {
        counter = inject(TestCounter);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      host.counter.increment();
      host.counter.increment();
      host.counter.setLabel('twice');
      fixture.detectChanges();
      expect(host.counter.state()).toEqual({count: 2, label: 'twice'});
    });

    it('accepts a lazy (function) patch', async () => {
      @Directive()
      class LazyPatch extends State<CounterState> {
        constructor() {
          super({count: 5, label: 'start'});
        }

        applyLazy(): void {
          this.patchState(() => ({label: 'lazy'}));
        }
      }

      @Directive({selector: '[test]', hostDirectives: [LazyPatch]})
      class Host {
        s = inject(LazyPatch);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      host.s.applyLazy();
      fixture.detectChanges();
      expect(host.s.state()).toEqual({count: 5, label: 'lazy'});
    });
  });

  describe('transform', () => {
    it('derives a public shape from internal state', async () => {
      interface InternalState {
        disabled: boolean | 'soft';
      }

      interface PublicState {
        disabled: boolean;
        softDisabled: boolean;
      }

      @Directive()
      class Disabler extends State<InternalState, PublicState> {
        constructor() {
          super(
            {disabled: false},
            {
              transform: (s) => ({
                disabled: s.disabled === true,
                softDisabled: s.disabled === 'soft',
              }),
            },
          );
        }

        disable(mode: boolean | 'soft'): void {
          this.patchState({disabled: mode});
        }
      }

      @Directive({selector: '[test]', hostDirectives: [Disabler]})
      class Host {
        disabler = inject(Disabler);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.disabler.state()).toEqual({disabled: false, softDisabled: false});

      host.disabler.disable('soft');
      fixture.detectChanges();
      expect(host.disabler.state()).toEqual({disabled: false, softDisabled: true});

      host.disabler.disable(true);
      fixture.detectChanges();
      expect(host.disabler.state()).toEqual({disabled: true, softDisabled: false});
    });

    it('transform runs inside a computed (reactive)', async () => {
      const multiplier = signal(2);

      @Directive()
      class Scaled extends State<number, string> {
        constructor() {
          super(5, {transform: (v) => `${v * multiplier()}`});
        }
      }

      @Directive({selector: '[test]', hostDirectives: [Scaled]})
      class Host {
        scaled = inject(Scaled);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.scaled.state()).toBe('10');

      multiplier.set(3);
      fixture.detectChanges();
      expect(host.scaled.state()).toBe('15');
    });
  });

  describe('deep-signal projection', () => {
    it('exposes nested properties as individual signals', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestCounter]})
      class Host {
        counter = inject(TestCounter);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.counter.state.count()).toBe(0);
      expect(host.counter.state.label()).toBe('default');

      host.counter.increment();
      fixture.detectChanges();
      expect(host.counter.state.count()).toBe(1);
      expect(host.counter.state.label()).toBe('default');
    });
  });

  describe('immutability', () => {
    it('state is read-only (frozen)', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestCounter]})
      class Host {
        counter = inject(TestCounter);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      const snapshot = host.counter.state();
      expect(() => {
        (snapshot as {count: number}).count = 999;
      }).toThrow();
    });
  });
});
