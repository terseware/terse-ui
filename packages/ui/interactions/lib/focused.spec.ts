import {Directive, inject} from '@angular/core';
import {fireEvent, render, screen} from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import {Focused} from './focused';

@Directive({
  selector: '[focused]',
  hostDirectives: [Focused],
})
class TestFocused {
  readonly focused = inject(Focused);
}

describe('Focused', () => {
  it('should not have data-focus or data-focus-visible initially', async () => {
    await render(`<button focused>Click me</button>`, {
      imports: [TestFocused],
    });

    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('data-focus');
    expect(button).not.toHaveAttribute('data-focus-visible');
  });

  it('should remove data-focus on blur', async () => {
    const {fixture} = await render(`<button focused>Click me</button>`, {
      imports: [TestFocused],
    });

    const button = screen.getByRole('button');
    button.focus();
    fixture.detectChanges();
    expect(button).toHaveAttribute('data-focus');

    button.blur();
    fixture.detectChanges();
    expect(button).not.toHaveAttribute('data-focus');
  });

  it('should remove data-focus-visible on blur', async () => {
    const {fixture} = await render(`<button focused>Click me</button>`, {
      imports: [TestFocused],
    });

    await userEvent.tab();
    fixture.detectChanges();
    expect(screen.getByRole('button')).toHaveAttribute('data-focus-visible', '');

    await userEvent.tab();
    fixture.detectChanges();
    expect(screen.getByRole('button')).not.toHaveAttribute('data-focus-visible');
  });

  describe('focus origin', () => {
    it('should attribute raw DOM focus to "program" when nothing else happened', async () => {
      // Initial modality is 'program' before any input events have fired.
      const {fixture} = await render(`<button focused>Click me</button>`, {
        imports: [TestFocused],
      });

      const button = screen.getByRole('button');
      button.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'program');
    });

    it('should attribute focus to "keyboard" after Tab', async () => {
      const {fixture} = await render(`<button focused>Click me</button>`, {
        imports: [TestFocused],
      });

      await userEvent.tab();
      fixture.detectChanges();

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-focus', 'keyboard');
      expect(button).toHaveAttribute('data-focus-visible', '');
    });

    it('should attribute focus to "mouse" after mousedown', async () => {
      const {fixture} = await render(`<button focused>Click me</button>`, {
        imports: [TestFocused],
      });

      const button = screen.getByRole('button');
      fireEvent.mouseDown(button);
      button.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'mouse');
    });

    it('should attribute focus to "touch" after touchstart', async () => {
      const {fixture} = await render(`<button focused>Click me</button>`, {
        imports: [TestFocused],
      });

      const button = screen.getByRole('button');
      fireEvent.touchStart(button);
      button.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'touch');
    });

    it('should attribute focus to "program" when Focused.focus() is called', async () => {
      // Even if the last user input was keyboard, calling Focused.focus()
      // must override the attribution to "program".
      const {fixture} = await render(`<button focused>Click me</button>`, {
        imports: [TestFocused],
      });

      // Simulate a keyboard interaction first so modality is 'keyboard'.
      await userEvent.tab();
      fixture.detectChanges();
      const button = screen.getByRole('button');
      button.blur();
      fixture.detectChanges();

      // Now drive focus through the Focused directive.
      const directive = fixture.debugElement
        .query((el) => el.nativeElement === button)!
        .injector.get(TestFocused);
      directive.focused.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'program');
    });

    it('should not treat a bare modifier keydown as keyboard intent', async () => {
      const {fixture} = await render(`<button focused>Click me</button>`, {
        imports: [TestFocused],
      });

      const button = screen.getByRole('button');
      // Holding Shift alone should not flip the modality to 'keyboard' —
      // the user might be about to shift-click which is a mouse interaction.
      fireEvent.keyDown(document.body, {key: 'Shift'});
      fireEvent.mouseDown(button);
      button.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'mouse');
    });

    it('should suppress "mouse" attribution during the touch buffer window', async () => {
      // A touchstart followed immediately by a mousedown (as browsers emit
      // on touch devices) should still resolve to "touch".
      const {fixture} = await render(`<button focused>Click me</button>`, {
        imports: [TestFocused],
      });

      const button = screen.getByRole('button');
      fireEvent.touchStart(button);
      fireEvent.mouseDown(button); // would normally overwrite to 'mouse'
      button.focus();
      fixture.detectChanges();

      expect(button).toHaveAttribute('data-focus', 'touch');
    });
  });

  describe('element types', () => {
    it('should work on button elements', async () => {
      const {fixture} = await render(`<button focused>Button</button>`, {
        imports: [TestFocused],
      });

      await userEvent.tab();
      fixture.detectChanges();

      expect(screen.getByRole('button')).toHaveAttribute('data-focus', 'keyboard');
      expect(screen.getByRole('button')).toHaveAttribute('data-focus-visible', '');
    });

    it('should work on input elements', async () => {
      const {fixture} = await render(`<input focused aria-label="Name" />`, {
        imports: [TestFocused],
      });

      await userEvent.tab();
      fixture.detectChanges();

      expect(screen.getByRole('textbox')).toHaveAttribute('data-focus', 'keyboard');
    });
  });
});
