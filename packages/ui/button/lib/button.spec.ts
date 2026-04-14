import {By} from '@angular/platform-browser';
import {fireEvent, render, screen} from '@testing-library/angular';
import {userEvent} from '@testing-library/user-event';
import {expectNoA11yViolations} from '../../test-axe';
import {Button} from './button';

describe('Button', () => {
  describe('disabled states', () => {
    it('hard disabled: sets disabled attribute on native elements', async () => {
      await render(`<button button disabled></button>`, {imports: [Button]});
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'hard');
      expect(button).not.toHaveAttribute('aria-disabled');
    });

    it('hard disabled: sets aria-disabled on non-native elements', async () => {
      await render(`<span button role="button" disabled></span>`, {imports: [Button]});
      const el = screen.getByRole('button');
      expect(el).not.toHaveAttribute('disabled');
      expect(el).toHaveAttribute('data-disabled', 'hard');
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).toHaveAttribute('tabindex', '-1');
    });

    it('soft disabled (softDisabled): removes native disabled and adds aria-disabled', async () => {
      await render(`<button button disabled softDisabled></button>`, {imports: [Button]});
      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'soft');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('tabindex', '0');
    });

    it('soft disabled: non-native element gets aria-disabled and remains softDisabled', async () => {
      await render(`<span button role="button" disabled softDisabled></span>`, {
        imports: [Button],
      });
      const el = screen.getByRole('button');
      expect(el).not.toHaveAttribute('disabled');
      expect(el).toHaveAttribute('data-disabled', 'soft');
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).toHaveAttribute('tabindex', '0');
    });

    it('not disabled: no disabled attributes', async () => {
      await render(`<button button></button>`, {imports: [Button]});
      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled');
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).toHaveAttribute('tabindex', '0');
    });
  });

  describe('tabIndex', () => {
    it('defaults to 0', async () => {
      await render(`<button button></button>`, {imports: [Button]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('respects custom tabIndex', async () => {
      await render(`<button button [tabIndex]="3"></button>`, {imports: [Button]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 3);
    });

    it('sets tabIndex to -1 when hard disabled on non-native elements', async () => {
      await render(`<span button role="button" disabled></span>`, {imports: [Button]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', -1);
    });

    it('preserves tabIndex when soft disabled', async () => {
      await render(`<span button role="button" disabled softDisabled></span>`, {
        imports: [Button],
      });
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });
  });

  describe('keyboard events', () => {
    it('prevents non-Tab key events when soft disabled', async () => {
      const {fixture} = await render(
        `<span
          button
          role="button"
          disabled
          softDisabled
        ></span>`,
        {imports: [Button]},
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
          button
          role="button"
          disabled
          softDisabled
        ></span>`,
        {imports: [Button]},
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
    it('hard disabled native button is not softDisabled', async () => {
      await render(`<button button disabled></button>`, {imports: [Button]});
      const button = screen.getByRole('button');
      await userEvent.keyboard('[Tab]');
      expect(button).not.toHaveFocus();
    });

    it('soft disabled element is softDisabled', async () => {
      await render(`<button button disabled softDisabled></button>`, {imports: [Button]});
      const button = screen.getByRole('button');
      await userEvent.keyboard('[Tab]');
      expect(button).toHaveFocus();
    });
  });

  it('should set the disabled attribute when disabled', async () => {
    const container = await render(`<button button [disabled]="true"></button>`, {
      imports: [Button],
    });

    expect(container.getByRole('button')).toHaveAttribute('disabled');
  });

  it('should not set the disabled attribute when not disabled', async () => {
    const container = await render(`<button button></button>`, {imports: [Button]});

    expect(container.getByRole('button')).not.toHaveAttribute('disabled');
  });

  it('should not set the disabled attribute when not a button', async () => {
    const container = await render(`<a button [disabled]="true"></a>`, {
      imports: [Button],
    });
    const button = container.debugElement.queryAll(By.css('a'));
    expect(button.length).toBe(1);
    expect(button[0].nativeElement).not.toHaveAttribute('disabled');
  });

  it('should set the data-disabled attribute when disabled', async () => {
    const container = await render(`<button button [disabled]="true"></button>`, {
      imports: [Button],
    });

    expect(container.getByRole('button')).toHaveAttribute('data-disabled', 'hard');
  });

  it('should not set the data-disabled attribute when not disabled', async () => {
    const container = await render(`<button button></button>`, {imports: [Button]});

    expect(container.getByRole('button')).not.toHaveAttribute('data-disabled');
  });

  it('should update the data-disabled attribute when disabled changes', async () => {
    const {getByRole, rerender, fixture} = await render(
      `<button button [disabled]="isDisabled"></button>`,
      {imports: [Button], componentProperties: {isDisabled: false}},
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
        await render(`<button button [disabled]="true">Click me</button>`, {
          imports: [Button],
        });

        expect(screen.getByRole('button')).toHaveAttribute('disabled');
      });

      it('should not set the disabled attribute when not disabled', async () => {
        await render(`<button button>Click me</button>`, {imports: [Button]});

        expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
      });

      it('should update disabled attribute when disabled changes', async () => {
        const {rerender, fixture} = await render(
          `<button button [disabled]="isDisabled">Click me</button>`,
          {imports: [Button], componentProperties: {isDisabled: false}},
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
        const container = await render(`<a button [disabled]="true">Link</a>`, {
          imports: [Button],
        });

        const anchor = container.debugElement.queryAll(By.css('a'));
        expect(anchor.length).toBe(1);
        expect(anchor[0].nativeElement).not.toHaveAttribute('disabled');
      });

      it('should not set the disabled attribute on div elements', async () => {
        await render(`<div button [disabled]="true">Custom</div>`, {imports: [Button]});

        const div = screen.getByRole('button');
        expect(div).not.toHaveAttribute('disabled');
      });
    });
  });

  describe('data-disabled attribute', () => {
    it('should set data-disabled when disabled', async () => {
      await render(`<button button [disabled]="true">Click me</button>`, {
        imports: [Button],
      });

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'hard');
    });

    it('should not set data-disabled when not disabled', async () => {
      await render(`<button button>Click me</button>`, {imports: [Button]});

      expect(screen.getByRole('button')).not.toHaveAttribute('data-disabled');
    });

    it('should update data-disabled when disabled changes', async () => {
      const {rerender, fixture} = await render(
        `<button button [disabled]="isDisabled">Click me</button>`,
        {imports: [Button], componentProperties: {isDisabled: false}},
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('data-disabled');

      await rerender({componentProperties: {isDisabled: true}});
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-disabled', 'hard');
    });

    it('should set data-disabled on non-native elements when disabled', async () => {
      await render(`<div button [disabled]="true">Custom</div>`, {imports: [Button]});

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'hard');
    });
  });

  describe('soft disabled', () => {
    it('should set data-disabled to soft when disabled and softDisabled is true', async () => {
      await render(`<button button [disabled]="true" [softDisabled]="true">Click me</button>`, {
        imports: [Button],
      });

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'soft');
    });

    it('should not set disabled when softDisabled is true', async () => {
      await render(`<button button [disabled]="true" [softDisabled]="true">Click me</button>`, {
        imports: [Button],
      });

      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'soft');
    });
  });

  describe('role attribute', () => {
    it('should not add role="button" to native button elements', async () => {
      await render(`<button button>Click me</button>`, {imports: [Button]});

      // Native buttons have implicit button role, no explicit attribute needed
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('role')).toBeNull();
    });

    it('should add role="button" to non-native elements without explicit role', async () => {
      await render(`<div button>Custom Button</div>`, {imports: [Button]});

      const div = screen.getByRole('button');
      expect(div).toHaveAttribute('role', 'button');
    });

    it('should not override explicit role input', async () => {
      await render(`<div button [role]="'menuitem'">Menu Item</div>`, {
        imports: [Button],
      });

      const div = screen.getByRole('menuitem');
      expect(div).toHaveAttribute('role', 'menuitem');
    });

    it('should preserve link role for anchors with href', async () => {
      const container = await render(`<a button href="/test">Link</a>`, {
        imports: [Button],
      });

      const link = container.debugElement.query(By.css('a'));
      expect(link.nativeElement).not.toHaveAttribute('role', 'button');
    });

    it('should not add role to input[type="button"]', async () => {
      await render(`<input button type="button" value="Input Button" />`, {
        imports: [Button],
      });

      const input = screen.getByRole('button');
      expect(input.getAttribute('role')).toBeNull();
    });

    it('should not add role to input[type="submit"]', async () => {
      await render(`<input button type="submit" value="Submit" />`, {imports: [Button]});

      const input = screen.getByRole('button');
      expect(input.getAttribute('role')).toBeNull();
    });

    it('should not add role to input[type="reset"]', async () => {
      await render(`<input button type="reset" value="Reset" />`, {imports: [Button]});

      const input = screen.getByRole('button');
      expect(input.getAttribute('role')).toBeNull();
    });
  });

  describe('with different element types', () => {
    it('should work with button elements', async () => {
      await render(`<button button>Button</button>`, {imports: [Button]});

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should work with anchor elements', async () => {
      const container = await render(`<a button href="#">Link</a>`, {imports: [Button]});

      const link = container.debugElement.query(By.css('a'));
      expect(link.nativeElement.tagName).toBe('A');
    });

    it('should work with div elements and add role', async () => {
      await render(`<div button>Custom</div>`, {imports: [Button]});

      const div = screen.getByRole('button');
      expect(div.tagName).toBe('DIV');
      expect(div).toHaveAttribute('role', 'button');
    });

    it('should work with span elements and add role', async () => {
      await render(`<span button>Custom</span>`, {imports: [Button]});

      const span = screen.getByRole('button');
      expect(span.tagName).toBe('SPAN');
      expect(span).toHaveAttribute('role', 'button');
    });

    it('should work with input[type="button"] elements', async () => {
      await render(`<input button type="button" value="Input Button" />`, {
        imports: [Button],
      });

      const input = screen.getByRole('button');
      expect(input.tagName).toBe('INPUT');
    });

    it('should work with input[type="submit"] elements', async () => {
      await render(`<input button type="submit" value="Submit" />`, {imports: [Button]});

      const input = screen.getByRole('button');
      expect(input.tagName).toBe('INPUT');
    });
  });

  describe('role attribute handling', () => {
    it('should preserve custom role via input through disabled state changes', async () => {
      const {rerender, fixture} = await render(
        `<div button [role]="'tab'" [disabled]="isDisabled">Tab</div>`,
        {imports: [Button], componentProperties: {isDisabled: false}},
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
      await render(`<div button [attr.role]="null">Custom</div>`, {imports: [Button]});

      // When role is null (default), auto-assignment kicks in for non-native elements
      expect(screen.getByRole('button')).toHaveAttribute('role', 'button');
    });

    it('should properly handle initial role assignment from attribute', async () => {
      const {rerender, fixture} = await render(`<div button [role]="role">Item</div>`, {
        imports: [Button],
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
      await render(`<button button>Click me</button>`, {imports: [Button]});

      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });

    it('should have tabindex="0" on non-native elements', async () => {
      await render(`<div button>Custom</div>`, {imports: [Button]});

      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });
  });

  describe('aria-disabled', () => {
    it('should set aria-disabled on non-native elements when disabled', async () => {
      await render(`<div button [disabled]="true">Custom</div>`, {imports: [Button]});

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not set aria-disabled on native button when disabled', async () => {
      await render(`<button button [disabled]="true">Click me</button>`, {
        imports: [Button],
      });

      // Native buttons use the disabled attribute, not aria-disabled
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
    });

    it('should update aria-disabled when disabled changes on non-native element', async () => {
      const {rerender, fixture} = await render(`<div button [disabled]="isDisabled">Custom</div>`, {
        imports: [Button],
        componentProperties: {isDisabled: false},
      });

      const div = screen.getByRole('button');
      expect(div).not.toHaveAttribute('aria-disabled');

      await rerender({componentProperties: {isDisabled: true}});
      fixture.detectChanges();
      expect(div).toHaveAttribute('aria-disabled', 'true');

      await rerender({componentProperties: {isDisabled: false}});
      fixture.detectChanges();
      expect(div).not.toHaveAttribute('aria-disabled');
    });

    it('should set aria-disabled on native button when softDisabled', async () => {
      await render(`<button button [disabled]="true" [softDisabled]="true">Click me</button>`, {
        imports: [Button],
      });

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('input types with native button behavior', () => {
    it('should set disabled attribute on input[type="button"] when disabled', async () => {
      await render(`<input button type="button" [disabled]="true" value="Input Button" />`, {
        imports: [Button],
      });

      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('should set disabled attribute on input[type="submit"] when disabled', async () => {
      await render(`<input button type="submit" [disabled]="true" value="Submit" />`, {
        imports: [Button],
      });

      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });

    it('should set disabled attribute on input[type="reset"] when disabled', async () => {
      await render(`<input button type="reset" [disabled]="true" value="Reset" />`, {
        imports: [Button],
      });

      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });
  });

  describe('combined disabled and softDisabled transitions', () => {
    it('should handle enabling softDisabled while already disabled', async () => {
      const {rerender, fixture} = await render(
        `<button button [disabled]="true" [softDisabled]="isDisabledActivatable">Click me</button>`,
        {imports: [Button], componentProperties: {isDisabledActivatable: false}},
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'hard');

      await rerender({componentProperties: {isDisabledActivatable: true}});
      fixture.detectChanges();

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'soft');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should handle tansitions and have softDisable take precedence', async () => {
      const {rerender, fixture} = await render(
        `<button button [disabled]="isDisabled" [softDisabled]="softDisabled">Click me</button>`,
        {imports: [Button], componentProperties: {isDisabled: false, softDisabled: false}},
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled');
      expect(button).not.toHaveAttribute('data-disabled');

      await rerender({componentProperties: {isDisabled: true, softDisabled: false}});
      fixture.detectChanges();

      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'hard');
      expect(button).not.toHaveAttribute('aria-disabled');

      await rerender({componentProperties: {isDisabled: true, softDisabled: true}});
      fixture.detectChanges();

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'soft');
      expect(button).toHaveAttribute('aria-disabled', 'true');

      await rerender({componentProperties: {isDisabled: false, softDisabled: true}});
      fixture.detectChanges();

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled', 'soft');
      expect(button).toHaveAttribute('aria-disabled', 'true');

      await rerender({componentProperties: {isDisabled: false, softDisabled: false}});
      fixture.detectChanges();

      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('data-disabled');
      expect(button).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('anchor elements with href (link buttons)', () => {
    it('should preserve link role on anchor with href', async () => {
      const container = await render(`<a button href="/dashboard">Dashboard</a>`, {
        imports: [Button],
      });

      const link = container.debugElement.query(By.css('a'));
      expect(link.nativeElement).toHaveAttribute('href', '/dashboard');
      // Should have implicit link role, not button
      expect(link.nativeElement.getAttribute('role')).toBeNull();
    });

    it('should set data-disabled on anchor with href when disabled', async () => {
      const container = await render(
        `<a button href="/dashboard" [disabled]="true">Dashboard</a>`,
        {
          imports: [Button],
        },
      );

      const link = container.debugElement.query(By.css('a')).nativeElement;
      expect(link).toHaveAttribute('data-disabled', 'hard');
      // Anchors don't support native disabled, so no disabled attribute
      expect(link).not.toHaveAttribute('disabled');
      // Should have aria-disabled for AT
      expect(link).toHaveAttribute('aria-disabled', 'true');
    });

    it('should support softDisabled on anchor with href', async () => {
      const container = await render(
        `<a button href="/dashboard" [disabled]="true" [softDisabled]="true">Dashboard</a>`,
        {imports: [Button]},
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
        const {fixture} = await render(`<span button (click)="onClick($event)">Action</span>`, {
          imports: [Button],
          componentProperties: {onClick: clickSpy},
        });

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
        const {fixture} = await render(`<span button (click)="onClick($event)">Action</span>`, {
          imports: [Button],
          componentProperties: {onClick: clickSpy},
        });

        const button = screen.getByRole('button');
        button.focus();
        fixture.detectChanges();
        expect(button).toHaveFocus();

        // keydown Space should NOT fire click yet
        const keydownEvent = new KeyboardEvent('keydown', {
          key: ' ',
          bubbles: true,
          cancelable: true,
        });
        button.dispatchEvent(keydownEvent);
        expect(clickSpy).toHaveBeenCalledTimes(0);
        // Should prevent default (scroll)
        expect(keydownEvent.defaultPrevented).toBe(true);

        // keyup Space should fire click
        const keyupEvent = new KeyboardEvent('keyup', {key: ' ', bubbles: true});
        button.dispatchEvent(keyupEvent);
        expect(clickSpy).toHaveBeenCalledTimes(1);
      });

      it('Space prevents default on keydown to avoid scrolling', async () => {
        await render(`<div button>Action</div>`, {imports: [Button]});

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
        await render(`<div button>Action</div>`, {imports: [Button]});

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
        await render(`<button button (click)="onClick($event)">Click me</button>`, {
          imports: [Button],
          componentProperties: {onClick: clickSpy},
        });

        const button = screen.getByRole('button');
        button.focus();

        // Simulate native Enter behavior: keydown fires native click
        const keydownEvent = new KeyboardEvent('keydown', {key: 'Enter', bubbles: true});
        button.dispatchEvent(keydownEvent);
        // Our handler should NOT fire click on native buttons
        expect(clickSpy).toHaveBeenCalledTimes(0);
      });

      it('does not double-fire click on Space (native handles it)', async () => {
        const clickSpy = vi.fn();
        await render(`<button button (click)="onClick($event)">Click me</button>`, {
          imports: [Button],
          componentProperties: {onClick: clickSpy},
        });

        const button = screen.getByRole('button');
        button.focus();

        const keyupEvent = new KeyboardEvent('keyup', {key: ' ', bubbles: true});
        button.dispatchEvent(keyupEvent);
        // Our handler should NOT fire click on native buttons
        expect(clickSpy).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe('disabled prevents interactions', () => {
    it('prevents click events when disabled', async () => {
      const clickSpy = vi.fn();
      await render(`<div button [disabled]="true" (click)="onClick($event)">Custom</div>`, {
        imports: [Button],
        componentProperties: {onClick: clickSpy},
      });

      const button = screen.getByRole('button');
      button.click();
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });

    it('prevents keyboard activation when disabled on non-native element', async () => {
      const clickSpy = vi.fn();
      await render(`<span button [disabled]="true" (click)="onClick($event)">Action</span>`, {
        imports: [Button],
        componentProperties: {onClick: clickSpy},
      });

      const button = screen.getByRole('button');

      button.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      expect(clickSpy).toHaveBeenCalledTimes(0);

      button.dispatchEvent(new KeyboardEvent('keyup', {key: ' ', bubbles: true}));
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('softDisabled prevents interactions except focus/blur', () => {
    it('allows focus when softDisabled', async () => {
      await render(
        `<span button role="button" [disabled]="true" [softDisabled]="true">Action</span>`,
        {imports: [Button]},
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('prevents click when softDisabled', async () => {
      const clickSpy = vi.fn();
      await render(
        `<span button [disabled]="true" [softDisabled]="true" (click)="onClick($event)">Action</span>`,
        {imports: [Button], componentProperties: {onClick: clickSpy}},
      );

      const button = screen.getByRole('button');
      button.click();
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });

    it('prevents Enter activation when softDisabled', async () => {
      const clickSpy = vi.fn();
      await render(
        `<span button [disabled]="true" [softDisabled]="true" (click)="onClick($event)">Action</span>`,
        {imports: [Button], componentProperties: {onClick: clickSpy}},
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      button.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });

    it('prevents Space activation when softDisabled', async () => {
      const clickSpy = vi.fn();
      await render(
        `<span button [disabled]="true" [softDisabled]="true" (click)="onClick($event)">Action</span>`,
        {imports: [Button], componentProperties: {onClick: clickSpy}},
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      button.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true}));
      button.dispatchEvent(new KeyboardEvent('keyup', {key: ' ', bubbles: true}));
      expect(clickSpy).toHaveBeenCalledTimes(0);
    });

    it('allows blur when softDisabled', async () => {
      const blurSpy = vi.fn();
      await render(
        `<span button [disabled]="true" [softDisabled]="true" (blur)="onBlur($event)">Action</span>`,
        {imports: [Button], componentProperties: {onBlur: blurSpy}},
      );

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
        `<button button [disabled]="isLoading" [softDisabled]="isLoading">
          {{ isLoading ? 'Loading...' : 'Submit' }}
        </button>`,
        {imports: [Button], componentProperties: {isLoading: false}},
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');

      // Start loading
      await rerender({componentProperties: {isLoading: true}});
      fixture.detectChanges();
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('data-disabled', 'soft');

      // Finish loading
      await rerender({componentProperties: {isLoading: false}});
      fixture.detectChanges();
      expect(button).toHaveAttribute('tabindex', '0');
      expect(button).not.toHaveAttribute('disabled');
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).not.toHaveAttribute('data-disabled');
    });
  });

  describe('Base-UI ported', () => {
    describe('prop: disabled', () => {
      it('native button: uses the disabled attribute and is not softDisabled', async () => {
        const handleClick = vi.fn();

        await render(`<button button disabled (click)="handleClick()"></button>`, {
          imports: [Button],
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

      it('custom element: applies aria-disabled and is not softDisabled', async () => {
        const handleClick = vi.fn();

        await render(`<span button disabled (click)="handleClick()"></span>`, {
          imports: [Button],
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

    describe('prop: softDisabled', () => {
      it('native button: prevents click but remains softDisabled', async () => {
        const handleClick = vi.fn();

        await render(`<button button disabled softDisabled (click)="handleClick()"></button>`, {
          imports: [Button],
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

      it('custom element: prevents click but remains softDisabled', async () => {
        const handleClick = vi.fn();

        await render(`<span button disabled softDisabled (click)="handleClick()"></span>`, {
          imports: [Button],
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
        await render(`<button button disabled softDisabled></button>`, {
          imports: [Button],
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
          `<span
              button
              disabled
              softDisabled
              (click)="handleClick()"
              (focus)="handleFocus()"
              (blur)="handleBlur()"
            ></span>`,
          {imports: [Button], componentProperties: {handleClick, handleFocus, handleBlur}},
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

            await render(`<div button (click)="onClick()"></div>`, {
              imports: [Button],
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
        await render(`<button button></button>`, {imports: [Button]});
        const button = screen.getByRole('button');
        expect(button).toHaveProperty('tabIndex', 0);
      });

      it('returns tabIndex when host component is not BUTTON', async () => {
        await render(`<span button></span>`, {imports: [Button]});
        const button = screen.getByRole('button');
        expect(button).toHaveProperty('tabIndex', 0);
      });

      it('returns custom tabIndex if explicitly provided', async () => {
        await render(`<button button [tabIndex]="3"></button>`, {imports: [Button]});
        const button = screen.getByRole('button');
        expect(button).toHaveProperty('tabIndex', 3);
      });
    });

    describe('arbitrary props', () => {
      it('passes data attributes to the host element', async () => {
        await render(`<button button data-testid="button-test-id"></button>`, {
          imports: [Button],
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
          `<span
              button
              (keydown)="handleKeyDown()"
              (keyup)="handleKeyUp()"
              (click)="handleClick()"
            ></span>`,
          {
            imports: [Button],
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
          `<span
              button
              (keyup)="handleKeyUp($event)"
              (click)="handleClick()"
            ></span>`,
          {
            imports: [Button],
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
          `<span
              button
              (keydown)="handleKeyDown()"
              (click)="handleClick()"
            ></span>`,
          {imports: [Button], componentProperties: {handleKeyDown, handleClick}},
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
        await render(`<span button></span>`, {imports: [Button]});
        expect(screen.getByRole('button')).toHaveAttribute('role', 'button');
      });

      it('native button does not get explicit role', async () => {
        await render(`<button button></button>`, {imports: [Button]});
        const button = screen.getByRole('button');
        expect(button).not.toHaveAttribute('role');
      });

      it('non-native button gets type=null (no type attribute)', async () => {
        await render(`<span button></span>`, {imports: [Button]});
        const button = screen.getByRole('button');
        expect(button).not.toHaveAttribute('type');
      });

      it('native button gets type="button"', async () => {
        await render(`<button button></button>`, {imports: [Button]});
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('type', 'button');
      });

      describe('Host attributes', () => {
        it('should keep the role attribute when it is explicitly set', async () => {
          await render(`<span button role="menuitem"></span>`, {imports: [Button]});
          const button = screen.getByRole('menuitem');
          expect(button).toHaveAttribute('role', 'menuitem');
        });

        it('should keep the type attribute when it is explicitly set', async () => {
          await render(`<button button type="submit"></button>`, {imports: [Button]});
          const button = screen.getByRole('button');
          expect(button).toHaveAttribute('type', 'submit');
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Axe a11y sweep — every button variant the library supports must leave
  // the rendered DOM free of accessibility violations. Axe catches issues the
  // unit assertions above can't, such as role/name inconsistencies,
  // aria-disabled placed on an invalid role, or missing accessible names.
  // ---------------------------------------------------------------------------

  describe('axe a11y', () => {
    it('native button with text content', async () => {
      const {container} = await render(`<button button>Save</button>`, {imports: [Button]});
      await expectNoA11yViolations(container);
    });

    it('native button with aria-label (icon button)', async () => {
      const {container} = await render(`<button button aria-label="Close">×</button>`, {
        imports: [Button],
      });
      await expectNoA11yViolations(container);
    });

    it('native button with type=submit in a form', async () => {
      const {container} = await render(
        `<form><button button type="submit">Submit</button></form>`,
        {imports: [Button]},
      );
      await expectNoA11yViolations(container);
    });

    it('native button hard-disabled', async () => {
      const {container} = await render(
        `<button button disabled aria-label="Submit">Submit</button>`,
        {imports: [Button]},
      );
      await expectNoA11yViolations(container);
    });

    it('native button soft-disabled (focusable, aria-disabled)', async () => {
      const {container} = await render(
        `<button button disabled softDisabled aria-label="Submit">Submit</button>`,
        {imports: [Button]},
      );
      await expectNoA11yViolations(container);
    });

    it('non-native <span role=button> with accessible name', async () => {
      const {container} = await render(`<span button role="button" aria-label="Go">Go</span>`, {
        imports: [Button],
      });
      await expectNoA11yViolations(container);
    });

    it('non-native <div> hard-disabled gets role=button and aria-disabled', async () => {
      const {container} = await render(`<div button disabled aria-label="Do it">Do it</div>`, {
        imports: [Button],
      });
      await expectNoA11yViolations(container);
    });

    it('non-native <div> soft-disabled remains tabbable and axe-clean', async () => {
      const {container} = await render(
        `<div button disabled softDisabled aria-label="Do it">Do it</div>`,
        {imports: [Button]},
      );
      await expectNoA11yViolations(container);
    });

    it('anchor with href exposes role=link and is axe-clean', async () => {
      const {container} = await render(`<a button href="/docs">Docs</a>`, {imports: [Button]});
      await expectNoA11yViolations(container);
    });

    it('anchor without href is axe-clean when it has a non-link role', async () => {
      // Anchors without href do not have the link role. Button composition
      // falls through to role=button on these, so axe treats them as buttons.
      const {container} = await render(`<a button aria-label="toggle">Toggle</a>`, {
        imports: [Button],
      });
      await expectNoA11yViolations(container);
    });

    it('<input type=button> with value as accessible name', async () => {
      const {container} = await render(`<input button type="button" value="Run" />`, {
        imports: [Button],
      });
      await expectNoA11yViolations(container);
    });

    it('<input type=submit> inside a form', async () => {
      const {container} = await render(`<form><input button type="submit" value="Save" /></form>`, {
        imports: [Button],
      });
      await expectNoA11yViolations(container);
    });

    it('button with explicit tabIndex override remains axe-clean', async () => {
      const {container} = await render(
        `<button button [tabIndex]="-1" aria-label="Skip">Skip</button>`,
        {imports: [Button]},
      );
      await expectNoA11yViolations(container);
    });

    it('button with role override (menuitem) is axe-clean inside a menu', async () => {
      const {container} = await render(
        `<div role="menu" aria-label="actions">
           <button button role="menuitem">Rename</button>
           <button button role="menuitem">Delete</button>
         </div>`,
        {imports: [Button]},
      );
      await expectNoA11yViolations(container);
    });

    it('disabled-state transitions keep the DOM axe-clean throughout', async () => {
      const {rerender, container} = await render(
        `<button button [disabled]="d" [softDisabled]="s" aria-label="Go">Go</button>`,
        {imports: [Button], componentProperties: {d: false, s: false}},
      );
      await expectNoA11yViolations(container);

      await rerender({componentProperties: {d: true, s: false}});
      await expectNoA11yViolations(container);

      await rerender({componentProperties: {d: true, s: true}});
      await expectNoA11yViolations(container);

      await rerender({componentProperties: {d: false, s: false}});
      await expectNoA11yViolations(container);
    });
  });
});
