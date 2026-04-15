import {By} from '@angular/platform-browser';
import {fireEvent, render, screen} from '@testing-library/angular';
import {TerseHoverable} from './terse-hoverable';

function pointer(type: string, extra: PointerEventInit = {}): PointerEventInit {
  return {pointerType: type, bubbles: true, cancelable: true, ...extra};
}

describe('Hoverable', () => {
  describe('disabled', () => {
    it('does not fire hover events when disabled', async () => {
      const hoverSpy = vi.fn();
      await render(`<div terseHoverable disabled (hoverChange)="onHover($event)">test</div>`, {
        imports: [TerseHoverable],
        componentProperties: {onHover: hoverSpy},
      });
      const el = screen.getByText('test');

      fireEvent.pointerEnter(el, pointer('mouse'));
      fireEvent.pointerLeave(el, pointer('mouse'));

      expect(hoverSpy).not.toHaveBeenCalled();
      expect(el).not.toHaveAttribute('data-hover');
    });
  });

  describe('pointer events', () => {
    it('fires hover events based on pointer events', async () => {
      const hoverSpy = vi.fn();
      await render(`<div terseHoverable (hoverChange)="onHover($event)">test</div>`, {
        imports: [TerseHoverable],
        componentProperties: {onHover: hoverSpy},
      });
      const el = screen.getByText('test');

      fireEvent.pointerEnter(el, pointer('mouse'));
      expect(hoverSpy).toHaveBeenNthCalledWith(1, true);

      fireEvent.pointerLeave(el, pointer('mouse'));
      expect(hoverSpy).toHaveBeenNthCalledWith(2, false);
      expect(hoverSpy).toHaveBeenCalledTimes(2);
    });

    it('does not re-fire when already hovered', async () => {
      const hoverSpy = vi.fn();
      await render(`<div terseHoverable (hoverChange)="onHover($event)">test</div>`, {
        imports: [TerseHoverable],
        componentProperties: {onHover: hoverSpy},
      });
      const el = screen.getByText('test');

      fireEvent.pointerEnter(el, pointer('mouse'));
      fireEvent.pointerEnter(el, pointer('mouse'));

      expect(hoverSpy).toHaveBeenCalledTimes(1);
    });

    it('does not fire hover events when pointerType is touch', async () => {
      const hoverSpy = vi.fn();
      await render(`<div terseHoverable (hoverChange)="onHover($event)">test</div>`, {
        imports: [TerseHoverable],
        componentProperties: {onHover: hoverSpy},
      });
      const el = screen.getByText('test');

      fireEvent.pointerEnter(el, pointer('touch'));
      fireEvent.pointerLeave(el, pointer('touch'));

      expect(hoverSpy).not.toHaveBeenCalled();
      expect(el).not.toHaveAttribute('data-hover');
    });

    it('ignores emulated mouse events that follow a touch', async () => {
      vi.useFakeTimers();
      try {
        const hoverSpy = vi.fn();
        await render(`<div terseHoverable (hoverChange)="onHover($event)">test</div>`, {
          imports: [TerseHoverable],
          componentProperties: {onHover: hoverSpy},
        });
        const el = screen.getByText('test');

        fireEvent.pointerDown(el, pointer('touch'));
        fireEvent.pointerEnter(el, pointer('touch'));
        fireEvent.pointerLeave(el, pointer('touch'));
        fireEvent.pointerUp(el, pointer('touch'));

        // iOS-style synthetic mouse enter/leave immediately after touch.
        fireEvent.pointerEnter(el, pointer('mouse'));
        fireEvent.pointerLeave(el, pointer('mouse'));

        expect(hoverSpy).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('accepts real mouse events once the post-touch delay expires', async () => {
      vi.useFakeTimers();
      try {
        const hoverSpy = vi.fn();
        await render(`<div terseHoverable (hoverChange)="onHover($event)">test</div>`, {
          imports: [TerseHoverable],
          componentProperties: {onHover: hoverSpy},
        });
        const el = screen.getByText('test');

        fireEvent.pointerDown(el, pointer('touch'));
        fireEvent.pointerEnter(el, pointer('touch'));
        fireEvent.pointerLeave(el, pointer('touch'));
        fireEvent.pointerUp(el, pointer('touch'));

        vi.advanceTimersByTime(600);

        fireEvent.pointerEnter(el, pointer('mouse'));
        fireEvent.pointerLeave(el, pointer('mouse'));

        expect(hoverSpy).toHaveBeenNthCalledWith(1, true);
        expect(hoverSpy).toHaveBeenNthCalledWith(2, false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('reflects data-hover via pointer events', async () => {
      const {fixture} = await render(`<div terseHoverable>test</div>`, {
        imports: [TerseHoverable],
      });
      const el = screen.getByText('test');

      fireEvent.pointerEnter(el, pointer('mouse'));
      fixture.detectChanges();
      expect(el).toHaveAttribute('data-hover');

      fireEvent.pointerLeave(el, pointer('mouse'));
      fixture.detectChanges();
      expect(el).not.toHaveAttribute('data-hover');
    });

    it('does not reflect data-hover on touch', async () => {
      const {fixture} = await render(`<div terseHoverable>test</div>`, {
        imports: [TerseHoverable],
      });
      const el = screen.getByText('test');

      fireEvent.pointerEnter(el, pointer('touch'));
      fixture.detectChanges();
      expect(el).not.toHaveAttribute('data-hover');

      fireEvent.pointerLeave(el, pointer('touch'));
      fixture.detectChanges();
      expect(el).not.toHaveAttribute('data-hover');
    });

    it('ends hover when disabled flips true while hovered', async () => {
      const hoverSpy = vi.fn();
      const {fixture, rerender} = await render(
        `<div terseHoverable [disabled]="d" (hoverChange)="onHover($event)">test</div>`,
        {
          imports: [TerseHoverable],
          componentProperties: {d: false as boolean, onHover: hoverSpy},
        },
      );
      const el = screen.getByText('test');

      fireEvent.pointerEnter(el, pointer('mouse'));
      fixture.detectChanges();
      expect(el).toHaveAttribute('data-hover');
      expect(hoverSpy).toHaveBeenNthCalledWith(1, true);

      await rerender({componentProperties: {d: true, onHover: hoverSpy}});
      fixture.detectChanges();

      expect(el).not.toHaveAttribute('data-hover');
      expect(hoverSpy).toHaveBeenLastCalledWith(false);
    });

    it('ends hover when a pointerover fires on an element outside the hovered target', async () => {
      const hoverSpy = vi.fn();
      const {fixture} = await render(
        `<div>
          <div terseHoverable (hoverChange)="onHover($event)" data-testid="host">host</div>
          <div data-testid="outside">outside</div>
        </div>`,
        {imports: [TerseHoverable], componentProperties: {onHover: hoverSpy}},
      );
      const host = screen.getByTestId('host');
      const outside = screen.getByTestId('outside');

      fireEvent.pointerEnter(host, pointer('mouse'));
      fixture.detectChanges();
      expect(host).toHaveAttribute('data-hover');

      // Simulate the browser firing pointerover on a sibling after the
      // hovered element is removed or shrinks — we never got a pointerleave.
      fireEvent.pointerOver(outside, pointer('mouse'));
      fixture.detectChanges();

      expect(host).not.toHaveAttribute('data-hover');
      expect(hoverSpy).toHaveBeenLastCalledWith(false);
    });
  });

  describe('composition', () => {
    it('exposes hover state to composing directives via DI', async () => {
      const {fixture} = await render(`<div terseHoverable data-testid="host">test</div>`, {
        imports: [TerseHoverable],
      });
      const consumer = fixture.debugElement
        .query(By.directive(TerseHoverable))
        .injector.get(TerseHoverable);
      const el = screen.getByTestId('host');

      expect(consumer.hovered()).toBe(false);

      fireEvent.pointerEnter(el, pointer('mouse'));
      expect(consumer.hovered()).toBe(true);

      fireEvent.pointerLeave(el, pointer('mouse'));
      expect(consumer.hovered()).toBe(false);
    });
  });
});
