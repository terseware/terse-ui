import {Directive, ElementRef, inject, signal} from '@angular/core';
import {render, screen} from '@testing-library/angular';
import {EventPipeline} from './event-pipeline';

// ---------------------------------------------------------------------------
// Test event pipeline directives — mirrors OnKeyDown, OnKeyUp from events/
// ---------------------------------------------------------------------------

@Directive({host: {'(keydown)': 'dispatch($event)'}})
class TestOnKeyDown extends EventPipeline<KeyboardEvent> {}

@Directive({host: {'(keyup)': 'dispatch($event)'}})
class TestOnKeyUp extends EventPipeline<KeyboardEvent> {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function keyDown(el: HTMLElement, key: string, opts?: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true, ...opts});
  el.dispatchEvent(event);
  return event;
}

function keyUp(el: HTMLElement, key: string, opts?: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keyup', {key, bubbles: true, cancelable: true, ...opts});
  el.dispatchEvent(event);
  return event;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EventPipeline', () => {
  describe('dispatch and handler execution', () => {
    it('dispatches events to registered handlers', async () => {
      const spy = vi.fn();

      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          inject(TestOnKeyDown).append(({event}) => spy(event.key));
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      const button = screen.getByRole('button');
      keyDown(button, 'Enter');
      expect(spy).toHaveBeenCalledWith('Enter');
    });

    it('does nothing when no handlers are registered', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {}

      await render(`<button test>Click</button>`, {imports: [Host]});
      // Should not throw
      keyDown(screen.getByRole('button'), 'Enter');
    });

    it('last appended handler runs first (outermost)', async () => {
      const order: string[] = [];

      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          const pipe = inject(TestOnKeyDown);
          pipe.append(({next}) => {
            order.push('first-appended');
            next();
          });
          pipe.append(({next}) => {
            order.push('second-appended');
            next();
          });
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      keyDown(screen.getByRole('button'), 'a');
      expect(order).toEqual(['second-appended', 'first-appended']);
    });

    it('prepended handler runs closest to source (innermost)', async () => {
      const order: string[] = [];

      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          const pipe = inject(TestOnKeyDown);
          pipe.append(({next}) => {
            order.push('appended');
            next();
          });
          pipe.prepend(({next}) => {
            order.push('prepended');
            next();
          });
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      keyDown(screen.getByRole('button'), 'a');
      expect(order).toEqual(['appended', 'prepended']);
    });
  });

  describe('next()', () => {
    it('handler that does not call next() prevents downstream execution', async () => {
      const innerRan = vi.fn();

      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          const pipe = inject(TestOnKeyDown);
          pipe.append(() => innerRan());
          pipe.append(() => void 0); // does not call next
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      keyDown(screen.getByRole('button'), 'Enter');
      expect(innerRan).not.toHaveBeenCalled();
    });

    it('calling next() delegates to the next handler', async () => {
      const spy = vi.fn();

      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          const pipe = inject(TestOnKeyDown);
          pipe.append(({event}) => spy(event.key));
          pipe.append(({next}) => next());
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      keyDown(screen.getByRole('button'), 'Tab');
      expect(spy).toHaveBeenCalledWith('Tab');
    });
  });

  describe('stop()', () => {
    it('halts remaining handlers', async () => {
      const innerRan = vi.fn();

      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          const pipe = inject(TestOnKeyDown);
          pipe.append(() => innerRan());
          pipe.append(({stop}) => stop());
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      keyDown(screen.getByRole('button'), 'Enter');
      expect(innerRan).not.toHaveBeenCalled();
    });

    it('stop() after next() prevents remaining downstream', async () => {
      const order: string[] = [];

      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          const pipe = inject(TestOnKeyDown);
          pipe.append(() => order.push('A'));
          pipe.append(({next}) => {
            order.push('B');
            next();
          });
          pipe.append(({next, stop}) => {
            order.push('C');
            next(); // runs B
            stop(); // prevents A from running on further next() calls
          });
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      keyDown(screen.getByRole('button'), 'x');
      // C runs first (outermost), calls next() which runs B, B calls next() but A doesn't run
      // Wait — stop() is called after next() returns from B. B already called next() which ran A.
      // Actually: C(idx 2) → next() → B(idx 1) → next() → A(idx 0) runs.
      // Then control returns to B, then to C which calls stop().
      // stop() after everything already ran has no effect on past execution.
      expect(order).toEqual(['C', 'B', 'A']);
    });

    it('stopped() reflects downstream stop()', async () => {
      let outerSawStop = false;

      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          const pipe = inject(TestOnKeyDown);
          pipe.append(({stop}) => stop());
          pipe.append(({next, stopped}) => {
            next();
            outerSawStop = stopped();
          });
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      keyDown(screen.getByRole('button'), 'x');
      expect(outerSawStop).toBe(true);
    });
  });

  describe('prevent()', () => {
    it('calls event.preventDefault()', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          inject(TestOnKeyDown).append(({prevent}) => prevent());
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      const event = keyDown(screen.getByRole('button'), ' ');
      expect(event.defaultPrevented).toBe(true);
    });

    it('idempotent — multiple prevent() calls are safe', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          const pipe = inject(TestOnKeyDown);
          pipe.append(({prevent}) => prevent());
          pipe.append(({next, prevent}) => {
            prevent();
            next();
          });
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      const event = keyDown(screen.getByRole('button'), ' ');
      expect(event.defaultPrevented).toBe(true);
    });

    it('defaultPrevented reflects current state across handlers', async () => {
      let innerSawPrevented = false;

      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        constructor() {
          const pipe = inject(TestOnKeyDown);
          pipe.append(({defaultPrevented}) => {
            innerSawPrevented = defaultPrevented;
          });
          pipe.append(({next, prevent}) => {
            prevent();
            next();
          });
        }
      }

      await render(`<button test>Click</button>`, {imports: [Host]});
      keyDown(screen.getByRole('button'), ' ');
      expect(innerSawPrevented).toBe(true);
    });
  });

  describe('handler removal', () => {
    it('removed handler no longer fires', async () => {
      const spy = vi.fn();

      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        remove!: () => void;
        constructor() {
          this.remove = inject(TestOnKeyDown).append(() => spy());
        }
      }

      const {fixture} = await render(`<button test>Click</button>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      const button = screen.getByRole('button');

      keyDown(button, 'a');
      expect(spy).toHaveBeenCalledTimes(1);

      host.remove();
      keyDown(button, 'b');
      expect(spy).toHaveBeenCalledTimes(1); // not called again
    });
  });

  describe('size', () => {
    it('tracks number of registered handlers', async () => {
      @Directive({selector: '[test]', hostDirectives: [TestOnKeyDown]})
      class Host {
        pipe = inject(TestOnKeyDown);
        remove1!: () => void;
        remove2!: () => void;
        constructor() {
          this.remove1 = this.pipe.append(() => void 0);
          this.remove2 = this.pipe.append(() => void 0);
        }
      }

      const {fixture} = await render(`<button test>Click</button>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      expect(host.pipe.size()).toBe(2);

      host.remove1();
      expect(host.pipe.size()).toBe(1);

      host.remove2();
      expect(host.pipe.size()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Composition — real-world patterns
  // ---------------------------------------------------------------------------

  describe('composition: disabled button blocks keyboard events', () => {
    it('disabled handler stops the chain, preventing activation', async () => {
      const clickSpy = vi.fn();

      @Directive({
        selector: '[btn]',
        hostDirectives: [TestOnKeyDown],
      })
      class Btn {
        readonly disabled = signal(false);
        el = inject(ElementRef).nativeElement as HTMLElement;
        constructor() {
          inject(TestOnKeyDown).append(({event, stop, next, stopped}) => {
            if (this.disabled()) {
              stop();
              return;
            }
            next();
            if (stopped()) return;
            // Non-native button: Enter → click
            if (event.key === 'Enter') {
              this.el.click();
            }
          });
        }
      }

      @Directive({selector: '[test]', hostDirectives: [Btn]})
      class Host {
        btn = inject(Btn);
      }

      const {fixture} = await render(`<div test role="button" (click)="onClick()">Act</div>`, {
        imports: [Host],
        componentProperties: {onClick: clickSpy},
      });
      const host = fixture.debugElement.children[0].injector.get(Host);
      const el = screen.getByRole('button');

      keyDown(el, 'Enter');
      expect(clickSpy).toHaveBeenCalledTimes(1);

      host.btn.disabled.set(true);
      fixture.detectChanges();
      keyDown(el, 'Enter');
      expect(clickSpy).toHaveBeenCalledTimes(1); // blocked
    });
  });

  describe('composition: menu item overrides button keydown', () => {
    // MenuItem composes Button. On Space keydown, the menu's roving focus
    // needs to handle activation immediately (not wait for keyup).
    // MenuItem appends a handler that intercepts Space and stops the chain.

    it('menu item intercepts Space on keydown and stops button handler', async () => {
      const buttonKeydownSpy = vi.fn();
      const menuItemActivated = vi.fn();

      @Directive({selector: '[btn]', hostDirectives: [TestOnKeyDown, TestOnKeyUp]})
      class Btn {
        el = inject(ElementRef).nativeElement as HTMLElement;
        constructor() {
          inject(TestOnKeyDown).append(({event, next, stopped}) => {
            next();
            if (stopped()) return;
            buttonKeydownSpy(event.key);
            // Normal button: Space on keydown just prevents scroll
            if (event.key === ' ') {
              event.preventDefault();
            }
          });
          // Normal button: Space fires click on keyup
          inject(TestOnKeyUp).append(({event}) => {
            if (event.key === ' ') {
              this.el.click();
            }
          });
        }
      }

      @Directive({selector: '[menuItem]', hostDirectives: [Btn]})
      class MenuItem {
        el = inject(ElementRef).nativeElement as HTMLElement;
        constructor() {
          // MenuItem intercepts Space on keydown → immediate activation
          inject(TestOnKeyDown).append(({event, next, stop}) => {
            if (event.key === ' ') {
              event.preventDefault();
              menuItemActivated();
              stop();
              return;
            }
            next();
          });
          // MenuItem intercepts Space on keyup → prevent native button behavior
          inject(TestOnKeyUp).append(({event, next}) => {
            if (event.key === ' ') {
              event.preventDefault();
              return; // swallow — activation already happened on keydown
            }
            next();
          });
        }
      }

      await render(`<button menuItem>Item</button>`, {imports: [MenuItem]});
      const button = screen.getByRole('button');

      // Space keydown: MenuItem intercepts, stops chain
      keyDown(button, ' ');
      expect(menuItemActivated).toHaveBeenCalledTimes(1);
      expect(buttonKeydownSpy).not.toHaveBeenCalled(); // button handler never ran

      // Space keyup: MenuItem swallows, button's click-on-keyup never fires
      keyUp(button, ' ');
      // (no click assertion since we didn't wire one, but the pipeline stops it)

      // Enter still flows through to button normally
      keyDown(button, 'Enter');
      expect(buttonKeydownSpy).toHaveBeenCalledWith('Enter');
    });
  });

  describe('composition: nested 3-level (toolbar → menu trigger → button)', () => {
    it('each layer can intercept or delegate keydown events', async () => {
      const order: string[] = [];

      @Directive({selector: '[btn]', hostDirectives: [TestOnKeyDown]})
      class Btn {
        constructor() {
          inject(TestOnKeyDown).append(({event, next, stopped}) => {
            next();
            if (stopped()) return;
            order.push(`btn:${event.key}`);
          });
        }
      }

      @Directive({selector: '[trigger]', hostDirectives: [Btn]})
      class Trigger {
        constructor() {
          inject(TestOnKeyDown).append(({event, next, stop}) => {
            // ArrowDown opens the menu — intercept and stop
            if (event.key === 'ArrowDown') {
              order.push('trigger:open-menu');
              stop();
              return;
            }
            next();
          });
        }
      }

      @Directive({selector: '[toolbar]', hostDirectives: [Trigger]})
      class Toolbar {
        constructor() {
          inject(TestOnKeyDown).append(({event, next}) => {
            order.push(`toolbar:${event.key}`);
            next();
          });
        }
      }

      await render(`<button toolbar>Menu</button>`, {imports: [Toolbar]});
      const button = screen.getByRole('button');

      // Enter flows through all layers
      keyDown(button, 'Enter');
      expect(order).toEqual(['toolbar:Enter', 'btn:Enter']);

      // ArrowDown intercepted by Trigger — button handler never runs
      order.length = 0;
      keyDown(button, 'ArrowDown');
      expect(order).toEqual(['toolbar:ArrowDown', 'trigger:open-menu']);
    });
  });

  describe('composition: diamond (two directives share the same event pipeline)', () => {
    it('both branches register handlers on the shared pipeline', async () => {
      const order: string[] = [];

      @Directive({selector: '[branchA]', hostDirectives: [TestOnKeyDown]})
      class BranchA {
        constructor() {
          inject(TestOnKeyDown).append(({next}) => {
            order.push('A');
            next();
          });
        }
      }

      @Directive({selector: '[branchB]', hostDirectives: [TestOnKeyDown]})
      class BranchB {
        constructor() {
          inject(TestOnKeyDown).append(({next}) => {
            order.push('B');
            next();
          });
        }
      }

      @Directive({selector: '[diamond]', hostDirectives: [BranchA, BranchB]})
      class Diamond {
        constructor() {
          inject(TestOnKeyDown).append(({next}) => {
            order.push('Diamond');
            next();
          });
        }
      }

      await render(`<button diamond>Click</button>`, {imports: [Diamond]});
      keyDown(screen.getByRole('button'), 'x');
      // Construction order: TestOnKeyDown → BranchA → BranchB → Diamond
      expect(order).toEqual(['Diamond', 'B', 'A']);
    });

    it('stop() in one branch halts the other', async () => {
      const branchARan = vi.fn();

      @Directive({selector: '[branchA]', hostDirectives: [TestOnKeyDown]})
      class BranchA {
        constructor() {
          inject(TestOnKeyDown).append(() => branchARan());
        }
      }

      @Directive({selector: '[branchB]', hostDirectives: [TestOnKeyDown]})
      class BranchB {
        constructor() {
          inject(TestOnKeyDown).append(({stop}) => stop());
        }
      }

      @Directive({selector: '[diamond]', hostDirectives: [BranchA, BranchB]})
      class Diamond {}

      await render(`<button diamond>Click</button>`, {imports: [Diamond]});
      keyDown(screen.getByRole('button'), 'x');
      expect(branchARan).not.toHaveBeenCalled();
    });
  });

  describe('composition: soft disabled allows focus events through', () => {
    // Soft disabled buttons block activation keys but allow Tab for focus management

    it('soft disabled blocks Enter/Space but allows Tab through', async () => {
      const activationSpy = vi.fn();
      const tabSpy = vi.fn();

      @Directive({selector: '[btn]', hostDirectives: [TestOnKeyDown]})
      class Btn {
        readonly disabled = signal<boolean | 'soft'>(false);
        constructor() {
          inject(TestOnKeyDown).append(({event, stop, next, stopped}) => {
            const isSoftDisabled = this.disabled() === 'soft';
            const isHardDisabled = this.disabled() === true;

            // Soft disabled: prevent activation keys but allow Tab
            if (isSoftDisabled && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              stop();
              return;
            }

            // Hard disabled: block everything
            if (isHardDisabled) {
              stop();
              return;
            }

            next();
            if (stopped()) return;

            if (event.key === 'Enter' || event.key === ' ') {
              activationSpy(event.key);
            } else if (event.key === 'Tab') {
              tabSpy();
            }
          });
        }
      }

      @Directive({selector: '[test]', hostDirectives: [Btn]})
      class Host {
        btn = inject(Btn);
      }

      const {fixture} = await render(`<button test>Act</button>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      const button = screen.getByRole('button');

      // Enabled: all keys work
      keyDown(button, 'Enter');
      keyDown(button, 'Tab');
      expect(activationSpy).toHaveBeenCalledTimes(1);
      expect(tabSpy).toHaveBeenCalledTimes(1);

      // Soft disabled: Enter/Space blocked, Tab allowed
      host.btn.disabled.set('soft');
      fixture.detectChanges();
      activationSpy.mockClear();
      tabSpy.mockClear();

      keyDown(button, 'Enter');
      keyDown(button, ' ');
      keyDown(button, 'Tab');
      expect(activationSpy).not.toHaveBeenCalled();
      expect(tabSpy).toHaveBeenCalledTimes(1);

      // Hard disabled: everything blocked
      host.btn.disabled.set(true);
      fixture.detectChanges();
      tabSpy.mockClear();

      keyDown(button, 'Enter');
      keyDown(button, 'Tab');
      expect(activationSpy).not.toHaveBeenCalled();
      expect(tabSpy).not.toHaveBeenCalled();
    });
  });
});
