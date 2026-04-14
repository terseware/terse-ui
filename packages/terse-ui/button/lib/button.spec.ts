import {By} from '@angular/platform-browser';
import {fireEvent, render, screen} from '@testing-library/angular';
import {userEvent} from '@testing-library/user-event';
import {TerseButton} from './terse-button';

describe('Button', () => {
  describe('disabled states', () => {
    it('hard disabled: sets disabled attribute on native elements', async () => {
      await render(`<button terseButton disabled></button>`, {imports: [TerseButton]});
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'hard');
      expect(button).not.toHaveAttribute('aria-disabled');
    });

    it('hard disabled: sets aria-disabled on non-native elements', async () => {
      await render(`<span terseButton role="button" disabled></span>`, {imports: [TerseButton]});
      const el = screen.getByRole('button');
      expect(el).not.toHaveAttribute('disabled');
      expect(el).toHaveAttribute('data-disabled', 'hard');
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).toHaveAttribute('tabindex', '-1');
    });

    it('soft disabled: removes native disabled and adds aria-disabled', async () => {
      await render(`<button terseButton disabled="soft"></button>`, {imports: [TerseButton]});
      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'soft');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('tabindex', '0');
    });

    it('soft disabled: non-native element gets aria-disabled and remains soft disabled', async () => {
      await render(`<span terseButton role="button" disabled="soft"></span>`, {
        imports: [TerseButton],
      });
      const el = screen.getByRole('button');
      expect(el).not.toHaveAttribute('disabled');
      expect(el).toHaveAttribute('data-disabled', 'soft');
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).toHaveAttribute('tabindex', '0');
    });

    it('not disabled: no disabled attributes', async () => {
      await render(`<button terseButton></button>`, {imports: [TerseButton]});
      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled');
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).toHaveAttribute('tabindex', '0');
    });
  });

  describe('tabIndex', () => {
    it('defaults to 0', async () => {
      await render(`<button terseButton></button>`, {imports: [TerseButton]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('respects custom tabIndex', async () => {
      await render(`<button terseButton [tabIndex]="3"></button>`, {imports: [TerseButton]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 3);
    });

    it('sets tabIndex to -1 when hard disabled on non-native elements', async () => {
      await render(`<span terseButton role="button" disabled></span>`, {imports: [TerseButton]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', -1);
    });

    it('preserves tabIndex when soft disabled', async () => {
      await render(`<span terseButton role="button" disabled="soft"></span>`, {
        imports: [TerseButton],
      });
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });
  });

  describe('keyboard events', () => {
    it('prevents non-Tab key events when soft disabled', async () => {
      const {fixture} = await render(
        `<span
          terseButton
          role="button"
          disabled="soft"
        ></span>`,
        {imports: [TerseButton]},
      );

      const el = screen.getByRole('button');
      el.focus();
      fixture.detectChanges();
      expect(el).toHaveFocus();

      const keydownEvent = new KeyboardEvent('keydown', {key: 'Enter', bubbles: true});
      const preventSpy = vi.spyOn(keydownEvent, 'preventDefault');
      el.dispatchEvent(keydownEvent);
      expect(preventSpy).toHaveBeenCalled();
    });

    it('allows Tab key when soft disabled', async () => {
      await render(
        `<span
          terseButton
          role="button"
          disabled="soft"
        ></span>`,
        {imports: [TerseButton]},
      );

      const el = screen.getByRole('button');
      el.focus();
      expect(el).toHaveFocus();

      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const preventSpy = vi.spyOn(keydownEvent, 'preventDefault');
      el.dispatchEvent(keydownEvent);
      expect(preventSpy).not.toHaveBeenCalled();
    });
  });

  describe('focus management', () => {
    it('hard disabled native button is not focusable', async () => {
      await render(`<button terseButton disabled></button>`, {imports: [TerseButton]});
      const button = screen.getByRole('button');
      await userEvent.keyboard('[Tab]');
      expect(button).not.toHaveFocus();
    });

    it('soft disabled element is focusable', async () => {
      await render(`<button terseButton disabled="soft"></button>`, {imports: [TerseButton]});
      const button = screen.getByRole('button');
      await userEvent.keyboard('[Tab]');
      expect(button).toHaveFocus();
    });
  });

  it('should set the disabled attribute when disabled', async () => {
    const container = await render(`<button terseButton [disabled]="true"></button>`, {
      imports: [TerseButton],
    });

    expect(container.getByRole('button')).toHaveAttribute('disabled');
  });

  it('should not set the disabled attribute when not disabled', async () => {
    const container = await render(`<button terseButton></button>`, {imports: [TerseButton]});

    expect(container.getByRole('button')).not.toHaveAttribute('disabled');
  });

  it('should not set the disabled attribute when not a button', async () => {
    const container = await render(`<a terseButton [disabled]="true"></a>`, {
      imports: [TerseButton],
    });
    const button = container.debugElement.queryAll(By.css('a'));
    expect(button.length).toBe(1);
    expect(button[0].nativeElement).not.toHaveAttribute('disabled');
  });

  it('should set the data-disabled attribute when disabled', async () => {
    const container = await render(`<button terseButton [disabled]="true"></button>`, {
      imports: [TerseButton],
    });

    expect(container.getByRole('button')).toHaveAttribute('data-disabled', 'hard');
  });

  it('should not set the data-disabled attribute when not disabled', async () => {
    const container = await render(`<button terseButton></button>`, {imports: [TerseButton]});

    expect(container.getByRole('button')).not.toHaveAttribute('data-disabled');
  });

  it('should update the data-disabled attribute when disabled changes', async () => {
    const {getByRole, rerender, fixture} = await render(
      `<button terseButton [disabled]="isDisabled"></button>`,
      {imports: [TerseButton], componentProperties: {isDisabled: false}},
    );

    const button = getByRole('button');
    expect(button).not.toHaveAttribute('data-disabled');
    expect(button).not.toHaveAttribute('disabled');

    await rerender({componentProperties: {isDisabled: true}});
    fixture.detectChanges();
    expect(button).toHaveAttribute('data-disabled');
    expect(button).toHaveAttribute('disabled');
  });

  describe('disabled state', () => {
    describe('native button', () => {
      it('should set the disabled attribute when disabled', async () => {
        await render(`<button terseButton [disabled]="true">Click me</button>`, {
          imports: [TerseButton],
        });

        expect(screen.getByRole('button')).toHaveAttribute('disabled');
      });

      it('should not set the disabled attribute when not disabled', async () => {
        await render(`<button terseButton>Click me</button>`, {imports: [TerseButton]});

        expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
      });

      it('should update disabled attribute when disabled changes', async () => {
        const {rerender, fixture} = await render(
          `<button terseButton [disabled]="isDisabled">Click me</button>`,
          {imports: [TerseButton], componentProperties: {isDisabled: false}},
        );

        const button = screen.getByRole('button');
        expect(button).not.toHaveAttribute('disabled');

        await rerender({componentProperties: {isDisabled: true}});
        fixture.detectChanges();
        expect(button).toHaveAttribute('disabled');

        await rerender({componentProperties: {isDisabled: false}});
        fixture.detectChanges();
        expect(button).not.toHaveAttribute('disabled');
      });
    });

    describe('non-native element', () => {
      it('should not set the disabled attribute on non-button elements', async () => {
        const container = await render(`<a terseButton [disabled]="true">Link</a>`, {
          imports: [TerseButton],
        });

        const anchor = container.debugElement.queryAll(By.css('a'));
        expect(anchor.length).toBe(1);
        expect(anchor[0].nativeElement).not.toHaveAttribute('disabled');
      });

      it('should not set the disabled attribute on div elements', async () => {
        await render(`<div terseButton [disabled]="true">Custom</div>`, {imports: [TerseButton]});

        const div = screen.getByRole('button');
        expect(div).not.toHaveAttribute('disabled');
      });
    });
  });

  describe('data-disabled attribute', () => {
    it('should set data-disabled when disabled', async () => {
      await render(`<button terseButton [disabled]="true">Click me</button>`, {
        imports: [TerseButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'hard');
    });

    it('should not set data-disabled when not disabled', async () => {
      await render(`<button terseButton>Click me</button>`, {imports: [TerseButton]});

      expect(screen.getByRole('button')).not.toHaveAttribute('data-disabled');
    });

    it('should update data-disabled when disabled changes', async () => {
      const {rerender, fixture} = await render(
        `<button terseButton [disabled]="isDisabled">Click me</button>`,
        {imports: [TerseButton], componentProperties: {isDisabled: false}},
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('data-disabled');

      await rerender({componentProperties: {isDisabled: true}});
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-disabled', 'hard');
    });

    it('should set data-disabled on non-native elements when disabled', async () => {
      await render(`<div terseButton [disabled]="true">Custom</div>`, {imports: [TerseButton]});

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'hard');
    });
  });

  describe('soft disabled', () => {
    it('should set data-disabled to soft when disabled="soft"', async () => {
      await render(`<button terseButton [disabled]="'soft'">Click me</button>`, {
        imports: [TerseButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'soft');
    });

    it('should not set native disabled when disabled="soft"', async () => {
      await render(`<button terseButton [disabled]="'soft'">Click me</button>`, {
        imports: [TerseButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'soft');
    });
  });

  describe('role attribute', () => {
    it('should not add role="button" to native button elements', async () => {
      await render(`<button terseButton>Click me</button>`, {imports: [TerseButton]});

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('role')).toBeNull();
    });

    it('should add role="button" to non-native elements without explicit role', async () => {
      await render(`<div terseButton>Custom Button</div>`, {imports: [TerseButton]});

      const div = screen.getByRole('button');
      expect(div).toHaveAttribute('role', 'button');
    });

    it('should not override explicit role input', async () => {
      await render(`<div terseButton [role]="'menuitem'">Menu Item</div>`, {
        imports: [TerseButton],
      });

      const div = screen.getByRole('menuitem');
      expect(div).toHaveAttribute('role', 'menuitem');
    });

    it('should preserve link role for anchors with href', async () => {
      const container = await render(`<a terseButton href="/test">Link</a>`, {
        imports: [TerseButton],
      });

      const link = container.debugElement.query(By.css('a'));
      expect(link.nativeElement).not.toHaveAttribute('role', 'button');
    });

    it('should not add role to input[type="button"]', async () => {
      await render(`<input terseButton type="button" value="Input Button" />`, {
        imports: [TerseButton],
      });

      const input = screen.getByRole('button');
      expect(input.getAttribute('role')).toBeNull();
    });

    it('should not add role to input[type="submit"]', async () => {
      await render(`<input terseButton type="submit" value="Submit" />`, {imports: [TerseButton]});

      const input = screen.getByRole('button');
      expect(input.getAttribute('role')).toBeNull();
    });

    it('should not add role to input[type="reset"]', async () => {
      await render(`<input terseButton type="reset" value="Reset" />`, {imports: [TerseButton]});

      const input = screen.getByRole('button');
      expect(input.getAttribute('role')).toBeNull();
    });
  });

  describe('with different element types', () => {
    it('should work with button elements', async () => {
      await render(`<button terseButton>Button</button>`, {imports: [TerseButton]});

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should work with anchor elements', async () => {
      const container = await render(`<a terseButton href="#">Link</a>`, {imports: [TerseButton]});

      const link = container.debugElement.query(By.css('a'));
      expect(link.nativeElement.tagName).toBe('A');
    });

    it('should work with div elements and add role', async () => {
      await render(`<div terseButton>Custom</div>`, {imports: [TerseButton]});

      const div = screen.getByRole('button');
      expect(div.tagName).toBe('DIV');
      expect(div).toHaveAttribute('role', 'button');
    });

    it('should work with span elements and add role', async () => {
      await render(`<span terseButton>Custom</span>`, {imports: [TerseButton]});

      const span = screen.getByRole('button');
      expect(span.tagName).toBe('SPAN');
      expect(span).toHaveAttribute('role', 'button');
    });

    it('should work with input[type="button"] elements', async () => {
      await render(`<input terseButton type="button" value="Input Button" />`, {
        imports: [TerseButton],
      });

      const input = screen.getByRole('button');
      expect(input.tagName).toBe('INPUT');
    });

    it('should work with input[type="submit"] elements', async () => {
      await render(`<input terseButton type="submit" value="Submit" />`, {imports: [TerseButton]});

      const input = screen.getByRole('button');
      expect(input.tagName).toBe('INPUT');
    });
  });

  describe('role attribute handling', () => {
    it('should preserve custom role via input through disabled state changes', async () => {
      const {rerender, fixture} = await render(
        `<div terseButton [role]="'tab'" [disabled]="isDisabled">Tab</div>`,
        {imports: [TerseButton], componentProperties: {isDisabled: false}},
      );

      const div = screen.getByRole('tab');
      expect(div).toHaveAttribute('role', 'tab');

      await rerender({componentProperties: {isDisabled: true}});
      fixture.detectChanges();
      expect(div).toHaveAttribute('role', 'tab');
      expect(div).toHaveAttribute('data-disabled', 'hard');

      await rerender({componentProperties: {isDisabled: false}});
      fixture.detectChanges();
      expect(div).toHaveAttribute('role', 'tab');
      expect(div).not.toHaveAttribute('data-disabled');
    });

    it('should fall back to auto-assignment when role is null on non-native elements', async () => {
      await render(`<div terseButton [attr.role]="null">Custom</div>`, {imports: [TerseButton]});

      expect(screen.getByRole('button')).toHaveAttribute('role', 'button');
    });

    it('should properly handle initial role assignment from attribute', async () => {
      const {rerender, fixture} = await render(`<div terseButton [role]="role">Item</div>`, {
        imports: [TerseButton],
        componentProperties: {role: 'tab'},
      });

      const el = screen.getByRole('tab');
      expect(el).toHaveAttribute('role', 'tab');

      await rerender({componentProperties: {role: 'option'}});
      fixture.detectChanges();
      expect(el).toHaveAttribute('role', 'option');
    });
  });

  describe('tabindex', () => {
    it('should have tabindex="0" by default', async () => {
      await render(`<button terseButton>Click me</button>`, {imports: [TerseButton]});

      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });

    it('should have tabindex="0" on non-native elements', async () => {
      await render(`<div terseButton>Custom</div>`, {imports: [TerseButton]});

      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });
  });

  describe('aria-disabled', () => {
    it('should set aria-disabled on non-native elements when disabled', async () => {
      await render(`<div terseButton [disabled]="true">Custom</div>`, {imports: [TerseButton]});

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not set aria-disabled on native button when disabled', async () => {
      await render(`<button terseButton [disabled]="true">Click me</button>`, {
        imports: [TerseButton],
      });

      expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
    });

    it('should update aria-disabled when disabled changes on non-native element', async () => {
      const {rerender, fixture} = await render(
        `<div terseButton [disabled]="isDisabled">Custom</div>`,
        {
          imports: [TerseButton],
          componentProperties: {isDisabled: false},
        },
      );

      const div = screen.getByRole('button');
      expect(div).not.toHaveAttribute('aria-disabled');

      await rerender({componentProperties: {isDisabled: true}});
      fixture.detectChanges();
      expect(div).toHaveAttribute('aria-disabled', 'true');

      await rerender({componentProperties: {isDisabled: false}});
      fixture.detectChanges();
      expect(div).not.toHaveAttribute('aria-disabled');
    });

    it('should set aria-disabled on native button when soft disabled', async () => {
      await render(`<button terseButton [disabled]="'soft'">Click me</button>`, {
        imports: [TerseButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('input types with native button behavior', () => {
    it('should set disabled attribute on input[type="button"] when disabled', async () => {
      await render(`<input terseButton type="button" [disabled]="true" value="Input Button" />`, {
        imports: [TerseButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('should set disabled attribute on input[type="submit"] when disabled', async () => {
      await render(`<input terseButton type="submit" [disabled]="true" value="Submit" />`, {
        imports: [TerseButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('should set disabled attribute on input[type="reset"] when disabled', async () => {
      await render(`<input terseButton type="reset" [disabled]="true" value="Reset" />`, {
        imports: [TerseButton],
      });

      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });
  });

  describe('disabled state transitions', () => {
    it('should handle transition from hard disabled to soft disabled', async () => {
      const {rerender, fixture} = await render(
        `<button terseButton [disabled]="disabled">Click me</button>`,
        {imports: [TerseButton], componentProperties: {disabled: true as boolean | 'soft'}},
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'hard');

      await rerender({componentProperties: {disabled: 'soft'}});
      fixture.detectChanges();

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'soft');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should handle transitions through all disabled states', async () => {
      const {rerender, fixture} = await render(
        `<button terseButton [disabled]="disabled">Click me</button>`,
        {imports: [TerseButton], componentProperties: {disabled: false as boolean | 'soft'}},
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled');
      expect(button).not.toHaveAttribute('aria-disabled');

      await rerender({componentProperties: {disabled: true}});
      fixture.detectChanges();

      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'hard');
      expect(button).not.toHaveAttribute('aria-disabled');

      await rerender({componentProperties: {disabled: 'soft'}});
      fixture.detectChanges();

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'soft');
      expect(button).toHaveAttribute('aria-disabled', 'true');

      await rerender({componentProperties: {disabled: false}});
      fixture.detectChanges();

      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled');
      expect(button).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('anchor elements with href (link buttons)', () => {
    it('should preserve link role on anchor with href', async () => {
      const container = await render(`<a terseButton href="/dashboard">Dashboard</a>`, {
        imports: [TerseButton],
      });

      const link = container.debugElement.query(By.css('a'));
      expect(link.nativeElement).toHaveAttribute('href', '/dashboard');
      expect(link.nativeElement.getAttribute('role')).toBeNull();
    });

    it('should set data-disabled on anchor with href when disabled', async () => {
      const container = await render(
        `<a terseButton href="/dashboard" [disabled]="true">Dashboard</a>`,
        {
          imports: [TerseButton],
        },
      );

      const link = container.debugElement.query(By.css('a')).nativeElement;
      expect(link).toHaveAttribute('data-disabled', 'hard');
      expect(link).not.toHaveAttribute('disabled');
      expect(link).toHaveAttribute('aria-disabled', 'true');
    });

    it('should support soft disabled on anchor with href', async () => {
      const container = await render(
        `<a terseButton href="/dashboard" [disabled]="'soft'">Dashboard</a>`,
        {imports: [TerseButton]},
      );

      const link = container.debugElement.query(By.css('a')).nativeElement;
      expect(link).toHaveAttribute('data-disabled', 'soft');
      expect(link).toHaveAttribute('tabindex', '0');
    });
  });

  describe('keyboard interactions', () => {
    describe('non-native button', () => {
      it('can be activated with Enter key', async () => {
        const clickSpy = vi.fn();
        const {fixture} = await render(
          `<span terseButton (click)="onClick($event)">Action</span>`,
          {
            imports: [TerseButton],
            componentProperties: {onClick: clickSpy},
          },
        );

        const button = screen.getByRole('button');
        button.focus();
        fixture.detectChanges();
        expect(button).toHaveFocus();

        const keydownEvent = new KeyboardEvent('keydown', {key: 'Enter', bubbles: true});
        button.dispatchEvent(keydownEvent);
        expect(clickSpy).toHaveBeenCalledTimes(1);
      });

      it('can be activated with Space key (fires on keyup)', async () => {
        const clickSpy = vi.fn();
        const {fixture} = await render(
          `<span terseButton (click)="onClick($event)">Action</span>`,
          {
            imports: [TerseButton],
            componentProperties: {onClick: clickSpy},
          },
        );

        const button = screen.getByRole('button');
        button.focus();
        fixture.detectChanges();
        expect(button).toHaveFocus();

        const keydownEvent = new KeyboardEvent('keydown', {
          key: ' ',
          bubbles: true,
          cancelable: true,
        });
        button.dispatchEvent(keydownEvent);
        expect(clickSpy).toHaveBeenCalledTimes(0);
        expect(keydownEvent.defaultPrevented).toBe(true);

        const keyupEvent = new KeyboardEvent('keyup', {key: ' ', bubbles: true});
        button.dispatchEvent(keyupEvent);
        expect(clickSpy).toHaveBeenCalledTimes(1);
      });

      it('Space prevents default on keydown to avoid scrolling', async () => {
        await render(`<div terseButton>Action</div>`, {imports: [TerseButton]});

        const button = screen.getByRole('button');
        button.focus();

        const keydownEvent = new KeyboardEvent('keydown', {
          key: ' ',
          bubbles: true,
          cancelable: true,
        });
        button.dispatchEvent(keydownEvent);
        expect(keydownEvent.defaultPrevented).toBe(true);
      });

      it('Enter prevents default on keydown', async () => {
        await render(`<div terseButton>Action</div>`, {imports: [TerseButton]});

        const button = screen.getByRole('button');
        button.focus();

        const keydownEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        });
        button.dispatchEvent(keydownEvent);
        expect(keydownEvent.defaultPrevented).toBe(true);
      });
    });

    describe('native button', () => {
      it('does not double-fire click on Enter (native handles it)', async () => {
        const clickSpy = vi.fn();
        await render(`<button terseButton (click)="onClick($event)">Click me</button>`, {
          imports: [TerseButton],
          componentProperties: {onClick: clickSpy},
        });

        const button = screen.getByRole('button');
        button.focus();

        const keydownEvent = new KeyboardEvent('keydown', {key: 'Enter', bubbles: true});
        button.dispatchEvent(keydownEvent);
        expect(clickSpy).toHaveBeenCalledTimes(0);
      });

      it('does not double-fire click on Space (native handles it)', async () => {
        const clickSpy = vi.fn();
        await render(`<button terseButton (click)="onClick($event)">Click me</button>`, {
          imports: [TerseButton],
          componentProperties: {onClick: clickSpy},
        });

        const button = screen.getByRole('button');
        button.focus();

        const keyupEvent = new KeyboardEvent('keyup', {key: ' ', bubbles: true});
        button.dispatchEvent(keyupEvent);
        expect(clickSpy).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe('disabled prevents interactions', () => {
    it('prevents click events when disabled', async () => {
      const clickSpy = vi.fn();
      await render(`<div terseButton [disabled]="true" (click)="onClick($event)">Custom</div>`, {
        imports: [TerseButton],
        componentProperties: {onClick: clickSpy},
      });

      const button = screen.getByRole('button');
      button.click();
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });

    it('prevents keyboard activation when disabled on non-native element', async () => {
      const clickSpy = vi.fn();
      await render(`<span terseButton [disabled]="true" (click)="onClick($event)">Action</span>`, {
        imports: [TerseButton],
        componentProperties: {onClick: clickSpy},
      });

      const button = screen.getByRole('button');

      button.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      expect(clickSpy).toHaveBeenCalledTimes(0);

      button.dispatchEvent(new KeyboardEvent('keyup', {key: ' ', bubbles: true}));
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('soft disabled prevents interactions except focus/blur', () => {
    it('allows focus when soft disabled', async () => {
      await render(`<span terseButton role="button" [disabled]="'soft'">Action</span>`, {
        imports: [TerseButton],
      });

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('prevents click when soft disabled', async () => {
      const clickSpy = vi.fn();
      await render(
        `<span terseButton [disabled]="'soft'" (click)="onClick($event)">Action</span>`,
        {
          imports: [TerseButton],
          componentProperties: {onClick: clickSpy},
        },
      );

      const button = screen.getByRole('button');
      button.click();
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });

    it('prevents Enter activation when soft disabled', async () => {
      const clickSpy = vi.fn();
      await render(
        `<span terseButton [disabled]="'soft'" (click)="onClick($event)">Action</span>`,
        {
          imports: [TerseButton],
          componentProperties: {onClick: clickSpy},
        },
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      button.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });

    it('prevents Space activation when soft disabled', async () => {
      const clickSpy = vi.fn();
      await render(
        `<span terseButton [disabled]="'soft'" (click)="onClick($event)">Action</span>`,
        {
          imports: [TerseButton],
          componentProperties: {onClick: clickSpy},
        },
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      button.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true}));
      button.dispatchEvent(new KeyboardEvent('keyup', {key: ' ', bubbles: true}));
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });

    it('allows blur when soft disabled', async () => {
      const blurSpy = vi.fn();
      await render(`<span terseButton [disabled]="'soft'" (blur)="onBlur($event)">Action</span>`, {
        imports: [TerseButton],
        componentProperties: {onBlur: blurSpy},
      });

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      button.blur();
      expect(blurSpy).toHaveBeenCalledTimes(1);
      expect(button).not.toHaveFocus();
    });
  });

  describe('loading state use case', () => {
    it('should maintain tabindex during loading state transitions', async () => {
      const {rerender, fixture} = await render(
        `<button terseButton [disabled]="disabled">
          {{ disabled ? 'Loading...' : 'Submit' }}
        </button>`,
        {imports: [TerseButton], componentProperties: {disabled: false as boolean | 'soft'}},
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');

      await rerender({componentProperties: {disabled: 'soft'}});
      fixture.detectChanges();
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('data-disabled', 'soft');

      await rerender({componentProperties: {disabled: false}});
      fixture.detectChanges();
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).not.toHaveAttribute('data-disabled');
    });
  });

  describe('Base-UI ported', () => {
    describe('prop: disabled', () => {
      it('native button: uses the disabled attribute and is not focusable', async () => {
        const handleClick = vi.fn();

        await render(`<button terseButton disabled (click)="handleClick()"></button>`, {
          imports: [TerseButton],
          componentProperties: {handleClick},
        });

        const button = screen.getByRole('button');

        expect(button).toHaveAttribute('disabled');
        expect(button).toHaveAttribute('data-disabled');
        expect(button).not.toHaveAttribute('aria-disabled');

        await userEvent.keyboard('[Tab]');
        expect(button).not.toHaveFocus();

        await userEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(0);
      });

      it('custom element: applies aria-disabled and is not focusable', async () => {
        const handleClick = vi.fn();

        await render(`<span terseButton disabled (click)="handleClick()"></span>`, {
          imports: [TerseButton],
          componentProperties: {handleClick},
        });

        const button = screen.getByRole('button');

        expect(button).not.toHaveAttribute('disabled');
        expect(button).toHaveAttribute('data-disabled');
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toHaveAttribute('tabindex', '-1');

        await userEvent.keyboard('[Tab]');
        expect(button).not.toHaveFocus();

        await userEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(0);
      });
    });

    describe('prop: disabled="soft"', () => {
      it('native button: prevents click but remains focusable', async () => {
        const handleClick = vi.fn();

        await render(`<button terseButton disabled="soft" (click)="handleClick()"></button>`, {
          imports: [TerseButton],
          componentProperties: {handleClick},
        });

        const button = screen.getByRole('button');

        expect(button).not.toHaveAttribute('disabled');
        expect(button).toHaveAttribute('data-disabled');
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toHaveAttribute('tabindex', '0');

        await userEvent.keyboard('[Tab]');
        expect(button).toHaveFocus();

        await userEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(0);
      });

      it('custom element: prevents click but remains focusable', async () => {
        const handleClick = vi.fn();

        await render(`<span terseButton disabled="soft" (click)="handleClick()"></span>`, {
          imports: [TerseButton],
          componentProperties: {handleClick},
        });

        const button = screen.getByRole('button');

        expect(button).not.toHaveAttribute('disabled');
        expect(button).toHaveAttribute('data-disabled');
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toHaveAttribute('tabindex', '0');

        await userEvent.keyboard('[Tab]');
        expect(button).toHaveFocus();

        await userEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(0);
      });

      it('allows disabled buttons to be focused', async () => {
        await render(`<button terseButton disabled="soft"></button>`, {
          imports: [TerseButton],
        });
        const button = screen.getByRole('button');
        await userEvent.keyboard('[Tab]');
        expect(button).toHaveFocus();
      });

      it('prevents click but allows focus and blur', async () => {
        const handleClick = vi.fn();
        const handleFocus = vi.fn();
        const handleBlur = vi.fn();

        await render(
          `<span terseButton disabled="soft" (click)="handleClick()" (focus)="handleFocus()" (blur)="handleBlur()"></span>`,
          {imports: [TerseButton], componentProperties: {handleClick, handleFocus, handleBlur}},
        );

        const button = screen.getByRole('button');
        expect(document.activeElement).not.toBe(button);

        expect(handleFocus).toHaveBeenCalledTimes(0);
        await userEvent.keyboard('[Tab]');
        expect(button).toHaveFocus();
        expect(handleFocus).toHaveBeenCalledTimes(1);

        await userEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(0);

        expect(handleBlur).toHaveBeenCalledTimes(0);
        await userEvent.keyboard('[Tab]');
        expect(handleBlur).toHaveBeenCalledTimes(1);
        expect(document.activeElement).not.toBe(button);
      });
    });

    describe('non-native button', () => {
      describe('keyboard interactions', () => {
        ['Enter', 'Space'].forEach((key) => {
          it(`can be activated with ${key} key`, async () => {
            const clickSpy = vi.fn();

            await render(`<div terseButton (click)="onClick()"></div>`, {
              imports: [TerseButton],
              componentProperties: {onClick: clickSpy},
            });

            const button = screen.getByRole('button');

            await userEvent.keyboard('[Tab]');
            expect(button).toHaveFocus();

            await userEvent.keyboard(`[${key}]`);
            expect(clickSpy).toHaveBeenCalledTimes(1);
          });
        });
      });
    });

    describe('param: tabIndex', () => {
      it('returns tabIndex when host component is BUTTON', async () => {
        await render(`<button terseButton></button>`, {imports: [TerseButton]});
        const button = screen.getByRole('button');
        expect(button).toHaveProperty('tabIndex', 0);
      });

      it('returns tabIndex when host component is not BUTTON', async () => {
        await render(`<span terseButton></span>`, {imports: [TerseButton]});
        const button = screen.getByRole('button');
        expect(button).toHaveProperty('tabIndex', 0);
      });

      it('returns custom tabIndex if explicitly provided', async () => {
        await render(`<button terseButton [tabIndex]="3"></button>`, {imports: [TerseButton]});
        const button = screen.getByRole('button');
        expect(button).toHaveProperty('tabIndex', 3);
      });
    });

    describe('arbitrary props', () => {
      it('passes data attributes to the host element', async () => {
        await render(`<button terseButton data-testid="button-test-id"></button>`, {
          imports: [TerseButton],
        });
        expect(screen.getByRole('button')).toHaveAttribute('data-testid', 'button-test-id');
      });
    });

    describe('event handlers', () => {
      it('key: Space fires keyup then click on non-composite buttons', async () => {
        const handleKeyDown = vi.fn();
        const handleKeyUp = vi.fn();
        const handleClick = vi.fn();

        await render(
          `<span terseButton (keydown)="handleKeyDown()" (keyup)="handleKeyUp()" (click)="handleClick()"></span>`,
          {
            imports: [TerseButton],
            componentProperties: {
              handleKeyDown,
              handleKeyUp,
              handleClick,
            },
          },
        );

        const button = screen.getByRole('button');
        button.focus();

        fireEvent.keyDown(button, {key: ' '});
        expect(handleKeyDown).toHaveBeenCalledTimes(1);
        expect(handleClick).toHaveBeenCalledTimes(0);

        fireEvent.keyUp(button, {key: ' '});
        expect(handleKeyUp).toHaveBeenCalledTimes(1);
        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('key: Space fires a click event even if preventDefault was called on keyUp', async () => {
        const handleClick = vi.fn();

        await render(
          `<span terseButton (keyup)="handleKeyUp($event)" (click)="handleClick()"></span>`,
          {
            imports: [TerseButton],
            componentProperties: {
              handleClick,
              handleKeyUp: (event: KeyboardEvent) => {
                event.preventDefault();
              },
            },
          },
        );

        const button = screen.getByRole('button');

        await userEvent.keyboard('[Tab]');
        expect(button).toHaveFocus();

        await userEvent.keyboard('[Space]');
        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('key: Enter fires keydown then click on non-native buttons', async () => {
        const handleKeyDown = vi.fn();
        const handleClick = vi.fn();

        await render(
          `<span terseButton (keydown)="handleKeyDown()" (click)="handleClick()"></span>`,
          {
            imports: [TerseButton],
            componentProperties: {handleKeyDown, handleClick},
          },
        );

        const button = screen.getByRole('button');
        button.focus();
        expect(button).toHaveFocus();

        expect(handleKeyDown).toHaveBeenCalledTimes(0);
        fireEvent.keyDown(button, {key: 'Enter'});
        expect(handleKeyDown).toHaveBeenCalledTimes(1);
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });

    describe('attributes', () => {
      it('non-native button gets role="button"', async () => {
        await render(`<span terseButton></span>`, {imports: [TerseButton]});
        expect(screen.getByRole('button')).toHaveAttribute('role', 'button');
      });

      it('native button does not get explicit role', async () => {
        await render(`<button terseButton></button>`, {imports: [TerseButton]});
        const button = screen.getByRole('button');
        expect(button).not.toHaveAttribute('role');
      });

      it('non-native button gets type=null (no type attribute)', async () => {
        await render(`<span terseButton></span>`, {imports: [TerseButton]});
        const button = screen.getByRole('button');
        expect(button).not.toHaveAttribute('type');
      });

      it('native button gets type="button"', async () => {
        await render(`<button terseButton></button>`, {imports: [TerseButton]});
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('type', 'button');
      });

      describe('Host attributes', () => {
        it('should keep the role attribute when it is explicitly set', async () => {
          await render(`<span terseButton role="menuitem"></span>`, {imports: [TerseButton]});
          const button = screen.getByRole('menuitem');
          expect(button).toHaveAttribute('role', 'menuitem');
        });

        it('should keep the type attribute when it is explicitly set', async () => {
          await render(`<button terseButton type="submit"></button>`, {imports: [TerseButton]});
          const button = screen.getByRole('button');
          expect(button).toHaveAttribute('type', 'submit');
        });
      });
    });
  });
});
