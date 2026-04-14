import {computed, Directive, inject, signal} from '@angular/core';
import {render} from '@testing-library/angular';
import {StatePipeline} from './state-pipeline';

// ---------------------------------------------------------------------------
// Test primitives — lightweight StatePipeline subclasses that mirror real
// atoms (Role, TabIndex, Disabled) without pulling in the full library.
// ---------------------------------------------------------------------------

@Directive()
class TestRole extends StatePipeline<string | null> {
  constructor() {
    super(null);
  }
}

@Directive()
class TestTabIndex extends StatePipeline<number | null> {
  constructor() {
    super(null);
  }
}

@Directive()
class TestDisabled extends StatePipeline<boolean> {
  constructor() {
    super(false);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StatePipeline', () => {
  describe('append / prepend ordering', () => {
    it('last appended handler runs first (outermost)', async () => {
      const order: string[] = [];

      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
        constructor() {
          this.role.append(({next}) => {
            order.push('first-appended');
            return next();
          });
          this.role.append(({next}) => {
            order.push('second-appended');
            return next();
          });
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      fixture.debugElement.children[0].injector.get(Host).role.state();
      expect(order).toEqual(['second-appended', 'first-appended']);
    });

    it('prepended handler runs closest to source (innermost)', async () => {
      const order: string[] = [];

      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
        constructor() {
          this.role.append(({next}) => {
            order.push('appended');
            return next();
          });
          this.role.prepend(({next}) => {
            order.push('prepended');
            return next();
          });
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      fixture.debugElement.children[0].injector.get(Host).role.state();
      expect(order).toEqual(['appended', 'prepended']);
    });
  });

  describe('next()', () => {
    it('delegates to downstream handler and returns its result', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestTabIndex]})
      class Host {
        tabIndex = inject(TestTabIndex);
        constructor() {
          // Inner handler sets a value
          this.tabIndex.append(() => 5);
          // Outer handler delegates
          this.tabIndex.append(({next}) => next());
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.tabIndex.state()).toBe(5);
    });

    it('falls back to source value when no handlers remain', async () => {
      const source = signal(42);

      @Directive()
      class SourcedIndex extends StatePipeline<number> {
        constructor() {
          super(computed(() => source()));
        }
      }

      @Directive({selector: '[test]', hostDirectives: [SourcedIndex]})
      class Host {
        idx = inject(SourcedIndex);
        constructor() {
          this.idx.append(({next}) => next());
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.idx.state()).toBe(42);
    });

    it('next(override) replaces source for downstream handlers', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
        constructor() {
          // Inner: fallback pattern
          this.role.append(({next}) => next() ?? 'fallback');
          // Outer: override pattern
          this.role.append(({next}) => next('menuitem'));
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      // Inner sees 'menuitem' from override, not null from source
      expect(host.role.state()).toBe('menuitem');
    });
  });

  describe('stop()', () => {
    it('halts the chain — downstream handlers do not run', async () => {
      const innerRan = vi.fn();

      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
        constructor() {
          this.role.append(() => {
            innerRan();
            return 'inner';
          });
          this.role.append(({stop}) => {
            stop();
            return 'stopped-here';
          });
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.role.state()).toBe('stopped-here');
      expect(innerRan).not.toHaveBeenCalled();
    });

    it('stop() causes next() to return currentSource without running handlers', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestTabIndex]})
      class Host {
        tabIndex = inject(TestTabIndex);
        constructor() {
          this.tabIndex.append(() => 99);
          this.tabIndex.append(({next, stop}) => {
            stop();
            return next(); // should return currentSource (null), not 99
          });
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.tabIndex.state()).toBeNull();
    });

    it('stopped() reflects downstream stop()', async () => {
      let stoppedBefore = false;
      let stoppedAfter = false;

      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
        constructor() {
          // Inner handler stops
          this.role.append(({stop}) => {
            stop();
            return 'inner';
          });
          // Outer handler checks stopped() after next()
          this.role.append(({next, stopped}) => {
            stoppedBefore = stopped();
            const result = next();
            stoppedAfter = stopped();
            return result;
          });
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      fixture.debugElement.children[0].injector.get(Host).role.state();
      expect(stoppedBefore).toBe(false);
      expect(stoppedAfter).toBe(true);
    });
  });

  describe('short-circuit (no next call)', () => {
    it('handler can return directly without calling next()', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
        constructor() {
          this.role.append(() => 'forced');
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.role.state()).toBe('forced');
    });

    it('downstream handlers do not run when short-circuiting', async () => {
      const innerRan = vi.fn();

      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
        constructor() {
          this.role.append(() => {
            innerRan();
            return 'inner';
          });
          this.role.append(() => 'outer');
        }
      }

      await render(`<div test></div>`, {imports: [Host]});
      expect(innerRan).not.toHaveBeenCalled();
    });
  });

  describe('handler removal', () => {
    it('append returns a removal function', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
        remove!: () => void;
        constructor() {
          this.remove = this.role.append(() => 'added');
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.role.state()).toBe('added');

      host.remove();
      fixture.detectChanges();
      expect(host.role.state()).toBeNull(); // back to source
    });

    it('removing a middle handler preserves chain order', async () => {
      const order: string[] = [];

      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
        removeB!: () => void;
        constructor() {
          this.role.append(({next}) => {
            order.push('A');
            return next();
          });
          this.removeB = this.role.append(({next}) => {
            order.push('B');
            return next();
          });
          this.role.append(({next}) => {
            order.push('C');
            return next();
          });
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      host.role.state();
      expect(order).toEqual(['C', 'B', 'A']);

      order.length = 0;
      host.removeB();
      fixture.detectChanges();
      host.role.state();
      expect(order).toEqual(['C', 'A']);
    });
  });

  describe('transform option', () => {
    it('transform sees the handler-modified value', async () => {
      @Directive()
      class Transformed extends StatePipeline<number, string> {
        constructor() {
          super(1, {transform: (v) => `result:${v}`});
          this.append(() => 42);
        }
      }

      @Directive({selector: '[test]', hostDirectives: [Transformed]})
      class Host {
        t = inject(Transformed);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.t.state()).toBe('result:42');
    });
  });

  // ---------------------------------------------------------------------------
  // Composition — the patterns that matter for the real library
  // ---------------------------------------------------------------------------

  describe('composition: single-level hostDirective', () => {
    it('composing directive overrides the base fallback', async () => {
      @Directive({selector: '[baseButton]', hostDirectives: [TestRole]})
      class BaseButton {
        constructor() {
          inject(TestRole).append(({next}) => next() ?? 'button');
        }
      }

      @Directive({selector: '[menuItem]', hostDirectives: [BaseButton]})
      class MenuItem {
        constructor() {
          inject(TestRole).append(({next}) => next('menuitem'));
        }
      }

      const {fixture} = await render(`<div menuItem></div>`, {imports: [MenuItem]});
      const role = fixture.debugElement.children[0].injector.get(TestRole);
      expect(role.state()).toBe('menuitem');
    });

    it('composing directive with stop() prevents base handler from running', async () => {
      const baseRan = vi.fn();

      @Directive({selector: '[baseButton]', hostDirectives: [TestRole]})
      class BaseButton {
        constructor() {
          inject(TestRole).append(() => {
            baseRan();
            return 'button';
          });
        }
      }

      @Directive({selector: '[menuItem]', hostDirectives: [BaseButton]})
      class MenuItem {
        constructor() {
          inject(TestRole).append(({stop}) => {
            stop();
            return 'menuitem';
          });
        }
      }

      const {fixture} = await render(`<div menuItem></div>`, {imports: [MenuItem]});
      const role = fixture.debugElement.children[0].injector.get(TestRole);
      expect(role.state()).toBe('menuitem');
      expect(baseRan).not.toHaveBeenCalled();
    });

    it('base fallback applies when composing directive delegates without override', async () => {
      @Directive({selector: '[baseButton]', hostDirectives: [TestRole]})
      class BaseButton {
        constructor() {
          inject(TestRole).append(({next}) => next() ?? 'button');
        }
      }

      // MenuTrigger doesn't touch role — just delegates
      @Directive({selector: '[menuTrigger]', hostDirectives: [BaseButton]})
      class MenuTrigger {}

      const {fixture} = await render(`<div menuTrigger></div>`, {imports: [MenuTrigger]});
      const role = fixture.debugElement.children[0].injector.get(TestRole);
      expect(role.state()).toBe('button');
    });
  });

  describe('composition: nested (3 levels)', () => {
    it('deepest composing directive wins with fallback pattern', async () => {
      @Directive({selector: '[btn]', hostDirectives: [TestRole, TestTabIndex]})
      class Btn {
        constructor() {
          inject(TestRole).append(({next}) => next() ?? 'button');
          inject(TestTabIndex).append(({next}) => next() ?? 0);
        }
      }

      @Directive({selector: '[menuItem]', hostDirectives: [Btn]})
      class MenuItem {
        constructor() {
          inject(TestRole).append(({next}) => next('menuitem'));
          inject(TestTabIndex).append(({next}) => next(-1));
        }
      }

      @Directive({selector: '[trigger]', hostDirectives: [MenuItem]})
      class Trigger {
        constructor() {
          inject(TestRole).append(({next}) => next('menuitem'));
          // Does not touch tabIndex — MenuItem's -1 should flow through
        }
      }

      const {fixture} = await render(`<div trigger></div>`, {imports: [Trigger]});
      const role = fixture.debugElement.children[0].injector.get(TestRole);
      const tabIndex = fixture.debugElement.children[0].injector.get(TestTabIndex);
      expect(role.state()).toBe('menuitem');
      expect(tabIndex.state()).toBe(-1);
    });

    it('middle layer can conditionally transform based on state', async () => {
      @Directive({selector: '[btn]', hostDirectives: [TestTabIndex]})
      class Btn {
        constructor() {
          inject(TestTabIndex).append(({next}) => next() ?? 0);
        }
      }

      @Directive({selector: '[menuItem]', hostDirectives: [Btn]})
      class MenuItem {
        readonly disabled = signal(false);
        constructor() {
          inject(TestTabIndex).append(({next}) => {
            if (this.disabled()) return -1;
            return next();
          });
        }
      }

      @Directive({selector: '[test]', hostDirectives: [MenuItem]})
      class Host {
        menuItem = inject(MenuItem);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      const tabIndex = fixture.debugElement.children[0].injector.get(TestTabIndex);
      expect(tabIndex.state()).toBe(0);

      host.menuItem.disabled.set(true);
      fixture.detectChanges();
      expect(tabIndex.state()).toBe(-1);
    });
  });

  describe('composition: diamond (two directives share the same pipeline)', () => {
    // Angular de-duplicates hostDirectives — TestRole is a single instance.
    // Both BranchA and BranchB append handlers to that same instance.
    // Construction order: TestRole → BranchA → BranchB → Diamond

    it('both branches contribute handlers to the shared pipeline', async () => {
      const order: string[] = [];

      @Directive({selector: '[branchA]', hostDirectives: [TestRole]})
      class BranchA {
        constructor() {
          inject(TestRole).append(({next}) => {
            order.push('A');
            return next() ?? 'from-A';
          });
        }
      }

      @Directive({selector: '[branchB]', hostDirectives: [TestRole]})
      class BranchB {
        constructor() {
          inject(TestRole).append(({next}) => {
            order.push('B');
            return next() ?? 'from-B';
          });
        }
      }

      // hostDirectives listed order: BranchA first, BranchB second
      // Angular constructs: TestRole → BranchA → BranchB → Diamond
      // Append order: A(idx 0), B(idx 1), Diamond(idx 2)
      // Execution: idx 2 → idx 1 → idx 0 (Diamond → B → A)
      @Directive({selector: '[diamond]', hostDirectives: [BranchA, BranchB]})
      class Diamond {
        constructor() {
          inject(TestRole).append(({next}) => {
            order.push('Diamond');
            return next();
          });
        }
      }

      const {fixture} = await render(`<div diamond></div>`, {imports: [Diamond]});
      fixture.debugElement.children[0].injector.get(TestRole).state();
      expect(order).toEqual(['Diamond', 'B', 'A']);
    });

    it('later branch can override earlier branch via next(override)', async () => {
      @Directive({selector: '[branchA]', hostDirectives: [TestRole]})
      class BranchA {
        constructor() {
          inject(TestRole).append(({next}) => next() ?? 'from-A');
        }
      }

      @Directive({selector: '[branchB]', hostDirectives: [TestRole]})
      class BranchB {
        constructor() {
          inject(TestRole).append(({next}) => next('from-B'));
        }
      }

      @Directive({selector: '[diamond]', hostDirectives: [BranchA, BranchB]})
      class Diamond {}

      const {fixture} = await render(`<div diamond></div>`, {imports: [Diamond]});
      const role = fixture.debugElement.children[0].injector.get(TestRole);
      // BranchB appended after BranchA → runs first, passes 'from-B' downstream
      // BranchA: next() returns 'from-B', so no fallback needed
      expect(role.state()).toBe('from-B');
    });

    it('stop() in one branch prevents the other from running', async () => {
      const branchARan = vi.fn();

      @Directive({selector: '[branchA]', hostDirectives: [TestRole]})
      class BranchA {
        constructor() {
          inject(TestRole).append(() => {
            branchARan();
            return 'from-A';
          });
        }
      }

      @Directive({selector: '[branchB]', hostDirectives: [TestRole]})
      class BranchB {
        constructor() {
          inject(TestRole).append(({stop}) => {
            stop();
            return 'from-B';
          });
        }
      }

      @Directive({selector: '[diamond]', hostDirectives: [BranchA, BranchB]})
      class Diamond {}

      const {fixture} = await render(`<div diamond></div>`, {imports: [Diamond]});
      const role = fixture.debugElement.children[0].injector.get(TestRole);
      expect(role.state()).toBe('from-B');
      expect(branchARan).not.toHaveBeenCalled();
    });

    it('outer handler detects stopped from inner branch', async () => {
      @Directive({selector: '[branchA]', hostDirectives: [TestRole]})
      class BranchA {
        constructor() {
          inject(TestRole).append(({stop}) => {
            stop();
            return 'stopped-by-A';
          });
        }
      }

      @Directive({selector: '[branchB]', hostDirectives: [TestRole]})
      class BranchB {
        constructor() {
          // BranchB runs after BranchA (higher index), so it's outer
          // But wait — BranchA is constructed first (hostDirective order),
          // so BranchA appends first (idx 0), BranchB appends second (idx 1).
          // Execution: idx 1 (BranchB) → idx 0 (BranchA).
          // So BranchB is outermost and runs first.
          inject(TestRole).append(({next, stopped}) => {
            const result = next(); // runs BranchA which stops
            if (stopped()) return `${result}+B-saw-stop`;
            return result;
          });
        }
      }

      @Directive({selector: '[diamond]', hostDirectives: [BranchA, BranchB]})
      class Diamond {}

      const {fixture} = await render(`<div diamond></div>`, {imports: [Diamond]});
      const role = fixture.debugElement.children[0].injector.get(TestRole);
      expect(role.state()).toBe('stopped-by-A+B-saw-stop');
    });
  });

  describe('composition: real-world patterns', () => {
    it('disabled button pattern: disabled overrides tabIndex', async () => {
      @Directive({selector: '[btn]', hostDirectives: [TestTabIndex, TestDisabled]})
      class Btn {
        readonly disabled = inject(TestDisabled);
        constructor() {
          inject(TestTabIndex).append(({next}) => {
            if (this.disabled.state()) return -1;
            return next() ?? 0;
          });
        }
      }

      @Directive({selector: '[test]', hostDirectives: [Btn]})
      class Host {
        btn = inject(Btn);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      const tabIndex = fixture.debugElement.children[0].injector.get(TestTabIndex);
      expect(tabIndex.state()).toBe(0);

      host.btn.disabled['patchState'](true);
      fixture.detectChanges();
      expect(tabIndex.state()).toBe(-1);
    });

    it('roving focus pattern: container overrides item tabIndex', async () => {
      @Directive({selector: '[item]', hostDirectives: [TestTabIndex]})
      class Item {
        constructor() {
          inject(TestTabIndex).append(({next}) => next() ?? 0);
        }
      }

      @Directive({selector: '[container]', hostDirectives: [Item]})
      class Container {
        readonly active = signal(false);
        constructor() {
          inject(TestTabIndex).append(({next}) => {
            if (!this.active()) return -1;
            return next();
          });
        }
      }

      @Directive({selector: '[test]', hostDirectives: [Container]})
      class Host {
        container = inject(Container);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      const tabIndex = fixture.debugElement.children[0].injector.get(TestTabIndex);

      expect(tabIndex.state()).toBe(-1);

      host.container.active.set(true);
      fixture.detectChanges();
      expect(tabIndex.state()).toBe(0);
    });

    it('multiple pipelines composed independently', async () => {
      @Directive({selector: '[btn]', hostDirectives: [TestRole, TestTabIndex, TestDisabled]})
      class Btn {
        readonly disabled = inject(TestDisabled);
        constructor() {
          inject(TestRole).append(({next}) => next() ?? 'button');
          inject(TestTabIndex).append(({next}) => {
            if (this.disabled.state()) return -1;
            return next() ?? 0;
          });
        }
      }

      @Directive({selector: '[menuItem]', hostDirectives: [Btn]})
      class MenuItem {
        constructor() {
          inject(TestRole).append(({next}) => next('menuitem'));
          inject(TestTabIndex).append(({next}) => next(-1));
        }
      }

      const {fixture} = await render(`<div menuItem></div>`, {imports: [MenuItem]});
      const role = fixture.debugElement.children[0].injector.get(TestRole);
      const tabIndex = fixture.debugElement.children[0].injector.get(TestTabIndex);
      const disabled = fixture.debugElement.children[0].injector.get(TestDisabled);

      expect(role.state()).toBe('menuitem');
      expect(tabIndex.state()).toBe(-1);

      disabled['patchState'](true);
      fixture.detectChanges();
      expect(tabIndex.state()).toBe(-1);
      expect(role.state()).toBe('menuitem');
    });
  });

  describe('edge cases', () => {
    it('handler returning undefined falls back to currentSource', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestTabIndex]})
      class Host {
        tabIndex = inject(TestTabIndex);
        constructor() {
          this.tabIndex.append(() => undefined as unknown as number | null);
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.tabIndex.state()).toBeNull();
    });

    it('multiple next() calls each execute downstream independently', async () => {
      let innerCount = 0;

      @Directive({selector: '[test]', hostDirectives: [TestTabIndex]})
      class Host {
        tabIndex = inject(TestTabIndex);
        constructor() {
          this.tabIndex.append(() => {
            innerCount++;
            return 10;
          });
          this.tabIndex.append(({next}) => {
            const a = next();
            const b = next();
            return (a ?? 0) + (b ?? 0);
          });
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.tabIndex.state()).toBe(20);
      expect(innerCount).toBe(2);
    });

    it('empty handler array returns source value', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.role.state()).toBeNull();
    });

    it('stop() before next() prevents all downstream execution', async () => {
      const downstream = vi.fn();

      @Directive({selector: '[test]', hostDirectives: [TestRole]})
      class Host {
        role = inject(TestRole);
        constructor() {
          this.role.append(() => {
            downstream();
            return 'downstream';
          });
          this.role.append(({stop}) => {
            stop();
            return 'stopped';
          });
        }
      }

      const {fixture} = await render(`<div test></div>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.role.state()).toBe('stopped');
      expect(downstream).not.toHaveBeenCalled();
    });
  });
});
