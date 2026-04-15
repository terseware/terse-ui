import {Directive, inject} from '@angular/core';
import {fireEvent, render, screen} from '@testing-library/angular';
import {Hover} from './hover';
import {TerseHover} from './terse-hover';

describe('Hover', () => {
  describe('basic hover state', () => {
    it('sets data-hover on pointer enter, removes on pointer leave', async () => {
      const {fixture} = await render(`<div terseHover>Hover me</div>`, {imports: [TerseHover]});
      const el = screen.getByText('Hover me');

      expect(el).not.toHaveAttribute('data-hover');

      fireEvent.pointerEnter(el, {pointerType: 'mouse'});
      fixture.detectChanges();
      expect(el).toHaveAttribute('data-hover');

      fireEvent.pointerLeave(el, {pointerType: 'mouse'});
      fixture.detectChanges();
      expect(el).not.toHaveAttribute('data-hover');
    });

    it('emits hoverChange on hover start and end', async () => {
      const hoverSpy = vi.fn();

      await render(`<div terseHover (terseHoverChange)="onHover($event)">Test</div>`, {
        imports: [TerseHover],
        componentProperties: {onHover: hoverSpy},
      });

      const el = screen.getByText('Test');

      fireEvent.pointerEnter(el, {pointerType: 'mouse'});
      expect(hoverSpy).toHaveBeenCalledWith(true);

      fireEvent.pointerLeave(el, {pointerType: 'mouse'});
      expect(hoverSpy).toHaveBeenCalledWith(false);
      expect(hoverSpy).toHaveBeenCalledTimes(2);
    });

    it('does not double-set hover on repeated pointer enter', async () => {
      const hoverSpy = vi.fn();

      await render(`<div terseHover (terseHoverChange)="onHover($event)">Test</div>`, {
        imports: [TerseHover],
        componentProperties: {onHover: hoverSpy},
      });

      const el = screen.getByText('Test');

      fireEvent.pointerEnter(el, {pointerType: 'mouse'});
      fireEvent.pointerEnter(el, {pointerType: 'mouse'});
      expect(hoverSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('touch suppression', () => {
    it('ignores touch pointer events', async () => {
      const hoverSpy = vi.fn();

      await render(`<div terseHover (terseHoverChange)="onHover($event)">Test</div>`, {
        imports: [TerseHover],
        componentProperties: {onHover: hoverSpy},
      });

      const el = screen.getByText('Test');

      fireEvent.pointerEnter(el, {pointerType: 'touch'});
      expect(el).not.toHaveAttribute('data-hover');
      expect(hoverSpy).not.toHaveBeenCalled();
    });

    it('ignores mouse enter after a local touch start', async () => {
      const hoverSpy = vi.fn();

      await render(`<div terseHover (terseHoverChange)="onHover($event)">Test</div>`, {
        imports: [TerseHover],
        componentProperties: {onHover: hoverSpy},
      });

      const el = screen.getByText('Test');

      fireEvent.touchStart(el);
      fireEvent.mouseEnter(el);
      expect(el).not.toHaveAttribute('data-hover');
      expect(hoverSpy).not.toHaveBeenCalled();
    });

    it('allows mouse enter after the local touch flag resets', async () => {
      const hoverSpy = vi.fn();

      await render(`<div terseHover (terseHoverChange)="onHover($event)">Test</div>`, {
        imports: [TerseHover],
        componentProperties: {onHover: hoverSpy},
      });

      const el = screen.getByText('Test');

      fireEvent.touchStart(el);
      fireEvent.mouseEnter(el); // suppressed, but also resets the flag

      // Second mouse enter should work because the flag was reset
      fireEvent.mouseEnter(el);
      expect(hoverSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('mouse enter/leave fallback', () => {
    it('sets hover via mouse enter when pointer events are not involved', async () => {
      const {fixture} = await render(`<div terseHover>Test</div>`, {imports: [TerseHover]});
      const el = screen.getByText('Test');

      fireEvent.mouseEnter(el);
      fixture.detectChanges();
      expect(el).toHaveAttribute('data-hover');

      fireEvent.mouseLeave(el);
      fixture.detectChanges();
      expect(el).not.toHaveAttribute('data-hover');
    });
  });

  describe('hoverEnabled', () => {
    it('does not set hover when disabled', async () => {
      const {fixture} = await render(`<div [terseHover]="false">Test</div>`, {
        imports: [TerseHover],
      });

      const el = screen.getByText('Test');
      fireEvent.pointerEnter(el, {pointerType: 'mouse'});
      fixture.detectChanges();
      expect(el).not.toHaveAttribute('data-hover');
    });

    it('clears hover when disabled while hovered', async () => {
      const {fixture, rerender} = await render(`<div [terseHover]="enabled">Test</div>`, {
        imports: [TerseHover],
        componentProperties: {enabled: true},
      });

      const el = screen.getByText('Test');
      fireEvent.pointerEnter(el, {pointerType: 'mouse'});
      fixture.detectChanges();
      expect(el).toHaveAttribute('data-hover');

      await rerender({componentProperties: {enabled: false}});
      fixture.detectChanges();
      expect(el).not.toHaveAttribute('data-hover');
    });
  });

  describe('composition', () => {
    it('composing directive can access hover state via injection', async () => {
      @Directive({
        selector: '[testHoverConsumer]',
        hostDirectives: [Hover],
      })
      class HoverConsumer {
        hover = inject(Hover);
      }

      const {fixture} = await render(`<div testHoverConsumer>Test</div>`, {
        imports: [HoverConsumer],
      });
      const consumer = fixture.debugElement.children[0].injector.get(HoverConsumer);
      const el = screen.getByText('Test');

      expect(consumer.hover.hovered()).toBe(false);

      fireEvent.pointerEnter(el, {pointerType: 'mouse'});
      expect(consumer.hover.hovered()).toBe(true);

      fireEvent.pointerLeave(el, {pointerType: 'mouse'});
      expect(consumer.hover.hovered()).toBe(false);
    });
  });
});
