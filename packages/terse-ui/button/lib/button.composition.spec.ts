import {Directive, ElementRef, inject, signal} from '@angular/core';
import {RoleAttribute} from '@terse-ui/core/attributes';
import {OnClick, OnKeyDown, OnKeyUp, OnMouseDown, OnPointerDown} from '@terse-ui/core/events';
import {fireEvent, render, screen} from '@testing-library/angular';
import {TerseButton} from './terse-button';

// ---------------------------------------------------------------------------
// Test composing directives — simulate real menu/toolbar patterns
// ---------------------------------------------------------------------------

/**
 * TestCompositeItem: simulates what a Menu or Toolbar item does.
 *
 * Composite widgets need Space to activate on keydown (not keyup) so that
 * roving focus and typeahead work correctly. The composing directive
 * achieves this by appending handlers to the event pipeline — no
 * `composite` flag needed on the button itself.
 */
@Directive({
  selector: '[testCompositeItem]',
  hostDirectives: [TerseButton],
})
class TestCompositeItem {
  readonly #element = inject(ElementRef).nativeElement as HTMLElement;

  constructor() {
    // Space fires on keydown (immediate activation)
    inject(OnKeyDown).append(({event, next, stop, stopped}) => {
      next();
      if (stopped()) return;

      if (event.target === event.currentTarget && event.key === ' ') {
        const role = (event.currentTarget as HTMLElement).getAttribute('role');
        const isTextNav = role?.startsWith('menuitem') || role === 'option' || role === 'gridcell';

        // Text navigation roles: if already defaultPrevented, skip activation
        if (event.defaultPrevented && isTextNav) {
          return;
        }

        event.preventDefault();
        this.#element.click();
        stop();
      }
    });

    // Suppress Space on keyup (activation already happened on keydown)
    inject(OnKeyUp).append(({event, next, stop}) => {
      if (event.target === event.currentTarget && event.key === ' ') {
        event.preventDefault();
        stop();
        return;
      }
      next();
    });
  }
}

@Directive({
  selector: '[testMenuItem]',
  hostDirectives: [TerseButton],
})
class TestMenuItem {
  constructor() {
    inject(RoleAttribute).append(({next}) => next('menuitem'));
  }
}

/**
 * TestMenuItemComposite: menu item that uses composite Space behavior.
 */
@Directive({
  selector: '[testMenuItemComposite]',
  hostDirectives: [TestCompositeItem],
})
class TestMenuItemComposite {
  constructor() {
    inject(RoleAttribute).append(({next}) => next('menuitem'));
  }
}

/**
 * TestRovingFocusItem: simulates roving focus container managing arrow keys.
 * Appends to OnKeyDown *after* button to handle navigation at the outer level.
 */
@Directive({
  selector: '[testRovingItem]',
  hostDirectives: [TerseButton],
})
class TestRovingItem {
  readonly navigated = signal<string | null>(null);
  constructor() {
    inject(OnKeyDown).append(({event, next}) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        this.navigated.set(event.key);
        event.preventDefault();
        return; // handle navigation, don't pass to button
      }
      next();
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Button composition', () => {
  // -----------------------------------------------------------------------
  // Role composition
  // -----------------------------------------------------------------------

  it('should compose with a menu item', async () => {
    await render(`<button testMenuItem>Click me</button>`, {
      imports: [TestMenuItem],
    });
    const button = screen.getByRole('menuitem');
    expect(button).toHaveAttribute('role', 'menuitem');
  });

  // -----------------------------------------------------------------------
  // Composite Space: keydown activation (ported from Base UI)
  // -----------------------------------------------------------------------

  it('Space fires keydown then click on non-native composite items', async () => {
    const handleKeyDown = vi.fn();
    const handleKeyUp = vi.fn();
    const handleClick = vi.fn();

    await render(
      `<span testCompositeItem
        (keydown)="handleKeyDown()"
        (keyup)="handleKeyUp()"
        (click)="handleClick()"
      ></span>`,
      {
        imports: [TestCompositeItem],
        componentProperties: {handleKeyDown, handleKeyUp, handleClick},
      },
    );

    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();

    fireEvent.keyDown(button, {key: ' '});
    expect(handleKeyDown).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(button, {key: ' '});
    expect(handleKeyUp).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledTimes(1); // no double-fire
  });

  it('Space fires keydown then click on native composite items', async () => {
    const handleKeyDown = vi.fn();
    const handleKeyUp = vi.fn();
    const handleClick = vi.fn();

    await render(
      `<button testCompositeItem
        (keydown)="handleKeyDown()"
        (keyup)="handleKeyUp()"
        (click)="handleClick()"
      >Item</button>`,
      {
        imports: [TestCompositeItem],
        componentProperties: {handleKeyDown, handleKeyUp, handleClick},
      },
    );

    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();

    fireEvent.keyDown(button, {key: ' '});
    expect(handleKeyDown).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(button, {key: ' '});
    expect(handleKeyUp).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledTimes(1); // no double-fire
  });

  it('Enter still works normally on composite items', async () => {
    const handleClick = vi.fn();

    await render(`<span testCompositeItem (click)="handleClick()"></span>`, {
      imports: [TestCompositeItem],
      componentProperties: {handleClick},
    });

    const button = screen.getByRole('button');
    button.focus();

    fireEvent.keyDown(button, {key: 'Enter'});
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Text navigation roles: Space prevented for typeahead
  // -----------------------------------------------------------------------

  it('does not click composite menuitems when Space is prevented for text navigation', async () => {
    const handleClick = vi.fn();

    await render(
      `<span testMenuItemComposite
        (keydown)="onKeyDown($event)"
        (click)="handleClick()"
      ></span>`,
      {
        imports: [TestMenuItemComposite],
        componentProperties: {
          handleClick,
          onKeyDown: (event: KeyboardEvent) => event.preventDefault(),
        },
      },
    );

    const item = screen.getByRole('menuitem');
    item.focus();

    fireEvent.keyDown(item, {key: ' '});
    expect(handleClick).toHaveBeenCalledTimes(0);
  });

  it('does not click composite gridcells when Space is prevented', async () => {
    const handleClick = vi.fn();

    @Directive({
      selector: '[testGridCell]',
      hostDirectives: [TestCompositeItem],
    })
    class TestGridCell {
      constructor() {
        inject(RoleAttribute).append(({next}) => next('gridcell'));
      }
    }

    await render(
      `<div testGridCell
        (keydown)="onKeyDown($event)"
        (click)="handleClick()"
      ></div>`,
      {
        imports: [TestGridCell],
        componentProperties: {
          handleClick,
          onKeyDown: (event: KeyboardEvent) => event.preventDefault(),
        },
      },
    );

    const cell = screen.getByRole('gridcell');
    cell.focus();

    fireEvent.keyDown(cell, {key: ' '});
    expect(handleClick).toHaveBeenCalledTimes(0);
  });

  it('clicks composite switches when Space is prevented (non-text-nav role)', async () => {
    const handleClick = vi.fn();

    @Directive({
      selector: '[testSwitch]',
      hostDirectives: [TestCompositeItem],
    })
    class TestSwitch {
      constructor() {
        inject(RoleAttribute).append(({next}) => next('switch'));
      }
    }

    await render(
      `<div testSwitch
        (keydown)="onKeyDown($event)"
        (click)="handleClick()"
      ></div>`,
      {
        imports: [TestSwitch],
        componentProperties: {
          handleClick,
          onKeyDown: (event: KeyboardEvent) => event.preventDefault(),
        },
      },
    );

    const el = screen.getByRole('switch');
    el.focus();

    fireEvent.keyDown(el, {key: ' '});
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // stop() replaces preventBaseUIHandler
  // -----------------------------------------------------------------------

  it('stop() on keydown prevents composite Space activation', async () => {
    const handleClick = vi.fn();

    @Directive({
      selector: '[testStopper]',
      hostDirectives: [TestCompositeItem],
    })
    class TestStopper {
      constructor() {
        inject(OnKeyDown).append(({next, stop}) => {
          stop(); // equivalent to preventBaseUIHandler()
          next();
        });
      }
    }

    await render(`<span testStopper (click)="handleClick()"></span>`, {
      imports: [TestStopper],
      componentProperties: {handleClick},
    });

    const button = screen.getByRole('button');
    button.focus();

    fireEvent.keyDown(button, {key: ' '});
    expect(handleClick).toHaveBeenCalledTimes(0);
  });

  // -----------------------------------------------------------------------
  // Arrow key navigation on soft disabled items
  // -----------------------------------------------------------------------

  it('soft disabled roving item: arrow keys navigate but activation is blocked', async () => {
    const handleClick = vi.fn();

    const {fixture} = await render(
      `<span testRovingItem [disabled]="'soft'" (click)="handleClick()">Item</span>`,
      {imports: [TestRovingItem], componentProperties: {handleClick}},
    );

    const item = screen.getByRole('button');
    item.focus();
    expect(item).toHaveFocus();
    expect(item).toHaveAttribute('aria-disabled', 'true');

    const rovingItem = fixture.debugElement.children[0].injector.get(TestRovingItem);

    // Arrow keys: roving focus handles them (outer handler, before disabled check)
    fireEvent.keyDown(item, {key: 'ArrowDown'});
    expect(rovingItem.navigated()).toBe('ArrowDown');

    fireEvent.keyDown(item, {key: 'ArrowUp'});
    expect(rovingItem.navigated()).toBe('ArrowUp');

    // Activation keys: blocked by button's soft disabled check
    fireEvent.keyDown(item, {key: 'Enter'});
    expect(handleClick).toHaveBeenCalledTimes(0);

    fireEvent.keyDown(item, {key: ' '});
    expect(handleClick).toHaveBeenCalledTimes(0);
  });

  it('hard disabled roving item: arrow keys still navigate', async () => {
    const {fixture} = await render(`<span testRovingItem disabled>Item</span>`, {
      imports: [TestRovingItem],
    });

    const item = screen.getByRole('button');
    const rovingItem = fixture.debugElement.children[0].injector.get(TestRovingItem);

    // Roving item's handler runs first (outermost), handles arrows
    // before delegating to button's disabled stop()
    fireEvent.keyDown(item, {key: 'ArrowDown'});
    expect(rovingItem.navigated()).toBe('ArrowDown');
  });

  // -----------------------------------------------------------------------
  // Non-composite button: Space fires on keyup (default behavior preserved)
  // -----------------------------------------------------------------------

  // -----------------------------------------------------------------------
  // Pipeline-level event suppression (OnClick, OnMouseDown, OnPointerDown)
  // -----------------------------------------------------------------------

  describe('pipeline-level event suppression', () => {
    it('onClick pipeline stops when disabled', async () => {
      const pipelineSpy = vi.fn();

      @Directive({
        selector: '[testClickConsumer]',
        hostDirectives: [TerseButton],
      })
      class ClickConsumer {
        constructor() {
          inject(OnClick).append(({next, stopped}) => {
            next();
            if (!stopped()) pipelineSpy();
          });
        }
      }

      await render(`<span testClickConsumer [disabled]="'soft'">Click me</span>`, {
        imports: [ClickConsumer],
      });

      const el = screen.getByRole('button');
      fireEvent.click(el);
      expect(pipelineSpy).not.toHaveBeenCalled();
    });

    it('onMouseDown pipeline stops when disabled', async () => {
      const pipelineSpy = vi.fn();

      @Directive({
        selector: '[testMouseConsumer]',
        hostDirectives: [TerseButton],
      })
      class MouseConsumer {
        constructor() {
          inject(OnMouseDown).append(({next, stopped}) => {
            next();
            if (!stopped()) pipelineSpy();
          });
        }
      }

      await render(`<span testMouseConsumer [disabled]="true">Click me</span>`, {
        imports: [MouseConsumer],
      });

      const el = screen.getByRole('button');
      fireEvent.mouseDown(el);
      expect(pipelineSpy).not.toHaveBeenCalled();
    });

    it('onPointerDown pipeline stops when disabled', async () => {
      const pipelineSpy = vi.fn();

      @Directive({
        selector: '[testPointerConsumer]',
        hostDirectives: [TerseButton],
      })
      class PointerConsumer {
        constructor() {
          inject(OnPointerDown).append(({next, stopped}) => {
            next();
            if (!stopped()) pipelineSpy();
          });
        }
      }

      await render(`<span testPointerConsumer [disabled]="true">Click me</span>`, {
        imports: [PointerConsumer],
      });

      const el = screen.getByRole('button');
      fireEvent.pointerDown(el);
      expect(pipelineSpy).not.toHaveBeenCalled();
    });

    it('onClick pipeline delegates when enabled', async () => {
      const pipelineSpy = vi.fn();

      @Directive({
        selector: '[testClickConsumer]',
        hostDirectives: [TerseButton],
      })
      class ClickConsumer {
        constructor() {
          inject(OnClick).append(({next, stopped}) => {
            next();
            if (!stopped()) pipelineSpy();
          });
        }
      }

      await render(`<span testClickConsumer>Click me</span>`, {imports: [ClickConsumer]});

      fireEvent.click(screen.getByRole('button'));
      expect(pipelineSpy).toHaveBeenCalledTimes(1);
    });

    it('composing directive detects disabled via stopped() on click', async () => {
      const results: boolean[] = [];

      @Directive({
        selector: '[testMenuTrigger]',
        hostDirectives: [TerseButton],
      })
      class TestMenuTrigger {
        btn = inject(TerseButton);
        constructor() {
          inject(OnClick).append(({next, stopped}) => {
            next();
            results.push(stopped());
          });
        }
      }

      const {fixture} = await render(`<button testMenuTrigger>Menu</button>`, {
        imports: [TestMenuTrigger],
      });

      const trigger = fixture.debugElement.children[0].injector.get(TestMenuTrigger);
      const button = screen.getByRole('button');

      // Enabled: stopped() is false
      fireEvent.click(button);
      expect(results).toEqual([false]);

      // Disable capture so the event reaches the pipeline, then soft-disable
      trigger.btn.patchOptions({captureClick: false});
      trigger.btn.disable('soft');
      fixture.detectChanges();

      fireEvent.click(button);
      expect(results).toEqual([false, true]);
    });
  });

  // -----------------------------------------------------------------------
  // Non-composite button: Space fires on keyup (default behavior preserved)
  // -----------------------------------------------------------------------

  it('without composite wrapper, Space fires click on keyup for non-native buttons', async () => {
    const handleKeyDown = vi.fn();
    const handleKeyUp = vi.fn();
    const handleClick = vi.fn();

    await render(
      `<span terseButton
        (keydown)="handleKeyDown()"
        (keyup)="handleKeyUp()"
        (click)="handleClick()"
      ></span>`,
      {
        imports: [TerseButton],
        componentProperties: {handleKeyDown, handleKeyUp, handleClick},
      },
    );

    const button = screen.getByRole('button');
    button.focus();

    fireEvent.keyDown(button, {key: ' '});
    expect(handleKeyDown).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledTimes(0); // not yet

    fireEvent.keyUp(button, {key: ' '});
    expect(handleKeyUp).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledTimes(1); // now
  });
});
