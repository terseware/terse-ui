import {Directive, inject} from '@angular/core';
import {fireEvent, render, screen} from '@testing-library/angular';
import {userEvent} from '@testing-library/user-event';
import {Focus} from './focus';
import {TerseFocus} from './terse-focus';

describe('Focus', () => {
  it('should not have data-focus or data-focus-visible initially', async () => {
    await render(`<button terseFocus>Click me</button>`, {imports: [TerseFocus]});

    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('data-focus');
    expect(button).not.toHaveAttribute('data-focus-visible');
  });

  it('should set data-focus on focus and remove on blur', async () => {
    const {fixture} = await render(`<button terseFocus>Click me</button>`, {
      imports: [TerseFocus],
    });

    const button = screen.getByRole('button');
    button.focus();
    fixture.detectChanges();
    expect(button).toHaveAttribute('data-focus');

    button.blur();
    fixture.detectChanges();
    expect(button).not.toHaveAttribute('data-focus');
  });

  it('should set and remove data-focus-visible via keyboard navigation', async () => {
    const {fixture} = await render(`<button terseFocus>Click me</button>`, {
      imports: [TerseFocus],
    });

    await userEvent.tab();
    fixture.detectChanges();
    expect(screen.getByRole('button')).toHaveAttribute('data-focus-visible', '');

    await userEvent.tab();
    fixture.detectChanges();
    expect(screen.getByRole('button')).not.toHaveAttribute('data-focus-visible');
  });

  describe('focus origin modality', () => {
    it('should attribute raw DOM focus to "program" when nothing else happened', async () => {
      const {fixture} = await render(`<button terseFocus>Click me</button>`, {
        imports: [TerseFocus],
      });

      const button = screen.getByRole('button');
      button.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'program');
    });

    it('should attribute focus to "keyboard" after Tab', async () => {
      const {fixture} = await render(`<button terseFocus>Click me</button>`, {
        imports: [TerseFocus],
      });

      await userEvent.tab();
      fixture.detectChanges();

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-focus', 'keyboard');
      expect(button).toHaveAttribute('data-focus-visible', '');
    });

    it('should attribute focus to "mouse" after mousedown', async () => {
      const {fixture} = await render(`<button terseFocus>Click me</button>`, {
        imports: [TerseFocus],
      });

      const button = screen.getByRole('button');
      fireEvent.mouseDown(button);
      button.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'mouse');
    });

    it('should attribute focus to "touch" after touchstart', async () => {
      const {fixture} = await render(`<button terseFocus>Click me</button>`, {
        imports: [TerseFocus],
      });

      const button = screen.getByRole('button');
      fireEvent.touchStart(button);
      button.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'touch');
    });

    it('should attribute focus to "program" when Focus.focus() is called', async () => {
      @Directive({
        selector: '[test]',
        hostDirectives: [TerseFocus],
      })
      class Host {
        focus = inject(Focus);
      }

      const {fixture} = await render(`<button test>Click me</button>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);

      // Set modality to keyboard first
      await userEvent.tab();
      fixture.detectChanges();
      const button = screen.getByRole('button');
      button.blur();
      fixture.detectChanges();

      // Programmatic focus should override to "program"
      host.focus.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'program');
    });

    it('should not treat a bare modifier keydown as keyboard intent', async () => {
      const {fixture} = await render(`<button terseFocus>Click me</button>`, {
        imports: [TerseFocus],
      });

      const button = screen.getByRole('button');
      fireEvent.keyDown(document.body, {key: 'Shift'});
      fireEvent.mouseDown(button);
      button.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'mouse');
    });

    it('should suppress "mouse" attribution during the touch buffer window', async () => {
      const {fixture} = await render(`<button terseFocus>Click me</button>`, {
        imports: [TerseFocus],
      });

      const button = screen.getByRole('button');
      fireEvent.touchStart(button);
      fireEvent.mouseDown(button); // emulated — should stay 'touch'
      button.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'touch');
    });
  });

  describe('outputs', () => {
    it('emits focusChange on focus and blur', async () => {
      const focusSpy = vi.fn();

      const {fixture} = await render(
        `<button terseFocus (terseFocusChange)="onFocus($event)">Click me</button>`,
        {imports: [TerseFocus], componentProperties: {onFocus: focusSpy}},
      );

      const button = screen.getByRole('button');
      button.focus();
      fixture.detectChanges();
      expect(focusSpy).toHaveBeenCalledWith('program');

      button.blur();
      fixture.detectChanges();
      expect(focusSpy).toHaveBeenCalledWith(null);
    });

    it('emits focusVisibleChange on keyboard focus and blur', async () => {
      const visibleSpy = vi.fn();

      const {fixture} = await render(
        `<button terseFocus (terseFocusVisibleChange)="onVisible($event)">Click me</button>`,
        {imports: [TerseFocus], componentProperties: {onVisible: visibleSpy}},
      );

      await userEvent.tab();
      fixture.detectChanges();
      expect(visibleSpy).toHaveBeenCalledWith(true);

      await userEvent.tab();
      fixture.detectChanges();
      expect(visibleSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('focusEnabled', () => {
    it('does not track focus when disabled', async () => {
      const {fixture} = await render(`<button terseFocus="false">Click me</button>`, {
        imports: [TerseFocus],
      });

      const button = screen.getByRole('button');
      button.focus();
      fixture.detectChanges();

      expect(button).not.toHaveAttribute('data-focus');
    });

    it('clears focus state when disabled while focused', async () => {
      const {fixture, rerender} = await render(`<button [terseFocus]="enabled">Click me</button>`, {
        imports: [TerseFocus],
        componentProperties: {enabled: true},
      });

      const button = screen.getByRole('button');
      button.focus();
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-focus');

      await rerender({componentProperties: {enabled: false}});
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-focus');
    });
  });

  describe('programmatic enable/disable', () => {
    it('disable() clears focus state', async () => {
      @Directive({
        selector: '[test]',
        hostDirectives: [TerseFocus],
      })
      class Host {
        focus = inject(Focus);
      }

      const {fixture} = await render(`<button test>Click me</button>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      const button = screen.getByRole('button');

      button.focus();
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-focus');

      host.focus.disable();
      fixture.detectChanges();
      expect(button).not.toHaveAttribute('data-focus');
    });

    it('enable() restores focus tracking', async () => {
      @Directive({
        selector: '[test]',
        hostDirectives: [TerseFocus],
      })
      class Host {
        focus = inject(Focus);
      }

      const {fixture} = await render(`<button test>Click me</button>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      const button = screen.getByRole('button');

      host.focus.disable();
      fixture.detectChanges();

      host.focus.enable();
      fixture.detectChanges();

      button.focus();
      fixture.detectChanges();
      expect(button).toHaveAttribute('data-focus');
    });
  });

  describe('blur()', () => {
    it('programmatically blurs the element', async () => {
      @Directive({
        selector: '[test]',
        hostDirectives: [TerseFocus],
      })
      class Host {
        focus = inject(Focus);
      }

      const {fixture} = await render(`<button test>Click me</button>`, {imports: [Host]});
      const host = fixture.debugElement.children[0].injector.get(Host);
      const button = screen.getByRole('button');

      button.focus();
      fixture.detectChanges();
      expect(button).toHaveFocus();
      expect(button).toHaveAttribute('data-focus');

      host.focus.blur();
      fixture.detectChanges();
      expect(button).not.toHaveFocus();
      expect(button).not.toHaveAttribute('data-focus');
    });
  });

  describe('element types', () => {
    it('should work on button elements', async () => {
      const {fixture} = await render(`<button terseFocus>Button</button>`, {
        imports: [TerseFocus],
      });

      await userEvent.tab();
      fixture.detectChanges();

      expect(screen.getByRole('button')).toHaveAttribute('data-focus', 'keyboard');
      expect(screen.getByRole('button')).toHaveAttribute('data-focus-visible', '');
    });

    it('should work on input elements', async () => {
      const {fixture} = await render(`<input terseFocus aria-label="Name" />`, {
        imports: [TerseFocus],
      });

      await userEvent.tab();
      fixture.detectChanges();

      expect(screen.getByRole('textbox')).toHaveAttribute('data-focus', 'keyboard');
    });
  });

  describe('composition', () => {
    it('composing directive can read focus state', async () => {
      @Directive({
        selector: '[testFocusConsumer]',
        hostDirectives: [Focus],
      })
      class FocusConsumer {
        focus = inject(Focus);
      }

      const {fixture} = await render(`<button testFocusConsumer>Click me</button>`, {
        imports: [FocusConsumer],
      });
      const consumer = fixture.debugElement.children[0].injector.get(FocusConsumer);
      const button = screen.getByRole('button');

      expect(consumer.focus.state.focused()).toBeNull();

      button.focus();
      expect(consumer.focus.state.focused()).toBe('program');

      button.blur();
      expect(consumer.focus.state.focused()).toBeNull();
    });
  });
});
