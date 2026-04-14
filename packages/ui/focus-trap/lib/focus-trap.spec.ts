import {Directive} from '@angular/core';
import {render, screen} from '@testing-library/angular';
import {FocusTrap} from './focus-trap';

@Directive({
  selector: '[focusTrap]',
  hostDirectives: [
    {
      directive: FocusTrap,
      inputs: ['focusTrapEnabled:focusTrap', 'focusTrapAutoFocus'],
    },
  ],
})
class TestFocusTrap {}

const TEMPLATE = `
  <div focusTrap data-testid="trap">
    <button data-testid="first">First</button>
    <button data-testid="middle">Middle</button>
    <button data-testid="last">Last</button>
  </div>
`;

function dispatchTab(target: EventTarget, shiftKey = false): void {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
}

describe('FocusTrap', () => {
  describe('host attributes', () => {
    it('should set data-focus-trap attribute', async () => {
      await render(TEMPLATE, {imports: [TestFocusTrap]});

      const trap = screen.getByTestId('trap');
      expect(trap).toHaveAttribute('data-focus-trap', '');
    });

    it('should set tabindex=-1 on container', async () => {
      await render(TEMPLATE, {imports: [TestFocusTrap]});

      const trap = screen.getByTestId('trap');
      expect(trap).toHaveAttribute('tabindex', '-1');
    });

    it('should not set data-focus-trap when disabled', async () => {
      await render(
        `
        <div [focusTrap]="false" data-testid="trap">
          <button>Btn</button>
        </div>
      `,
        {imports: [TestFocusTrap]},
      );

      const trap = screen.getByTestId('trap');
      expect(trap).not.toHaveAttribute('data-focus-trap');
    });
  });

  describe('tab wrapping', () => {
    it('should wrap focus from last to first on Tab', async () => {
      await render(TEMPLATE, {imports: [TestFocusTrap]});

      const first = screen.getByTestId('first');
      const last = screen.getByTestId('last');

      last.focus();
      expect(document.activeElement).toBe(last);

      dispatchTab(last);
      expect(document.activeElement).toBe(first);
    });

    it('should wrap focus from first to last on Shift+Tab', async () => {
      await render(TEMPLATE, {imports: [TestFocusTrap]});

      const first = screen.getByTestId('first');
      const last = screen.getByTestId('last');

      first.focus();
      expect(document.activeElement).toBe(first);

      dispatchTab(first, true);
      expect(document.activeElement).toBe(last);
    });

    it('should not wrap focus on Tab when element is in the middle', async () => {
      await render(TEMPLATE, {imports: [TestFocusTrap]});

      const middle = screen.getByTestId('middle');

      middle.focus();
      expect(document.activeElement).toBe(middle);

      dispatchTab(middle);
      expect(document.activeElement).toBe(middle);
    });
  });

  describe('disabled', () => {
    it('should not trap focus when disabled', async () => {
      await render(
        `
        <div [focusTrap]="false" data-testid="trap">
          <button data-testid="btn">Btn</button>
        </div>
      `,
        {imports: [TestFocusTrap]},
      );

      const btn = screen.getByTestId('btn');
      btn.focus();

      dispatchTab(btn);
      expect(document.activeElement).toBe(btn);
    });
  });

  describe('tabbable edge detection', () => {
    it('should wrap correctly with mixed tabbable and non-tabbable content', async () => {
      await render(
        `
        <div focusTrap data-testid="trap">
          <span>Not tabbable</span>
          <button data-testid="a">A</button>
          <span>Also not tabbable</span>
          <input data-testid="b" />
        </div>
      `,
        {imports: [TestFocusTrap]},
      );

      const a = screen.getByTestId('a');
      const b = screen.getByTestId('b');

      // Tab from last tabbable wraps to first
      b.focus();
      dispatchTab(b);
      expect(document.activeElement).toBe(a);

      // Shift+Tab from first tabbable wraps to last
      dispatchTab(a, true);
      expect(document.activeElement).toBe(b);
    });

    it('should prevent Tab from leaving when no tabbable elements exist', async () => {
      await render(
        `
        <div focusTrap data-testid="trap">
          <span>No tabbable content</span>
        </div>
      `,
        {imports: [TestFocusTrap]},
      );

      const trap = screen.getByTestId('trap');
      trap.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      trap.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });
});
