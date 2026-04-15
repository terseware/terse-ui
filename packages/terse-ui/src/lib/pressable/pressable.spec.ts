import {fireEvent, render, screen} from '@testing-library/angular';
import type {PressEvent} from './pressable';
import {TersePressable} from './terse-pressable';

function pointer(
  type: string,
  opts: PointerEventInit = {},
): PointerEventInit & {pointerId: number; pointerType: string} {
  return {
    pointerId: 1,
    pointerType: type,
    button: 0,
    bubbles: true,
    cancelable: true,
    clientX: 0,
    clientY: 0,
    ...opts,
  } as PointerEventInit & {pointerId: number; pointerType: string};
}

function capturing() {
  const events: Array<PressEvent | {type: string; pressed?: boolean}> = [];
  return {
    events,
    onPressStart: (e: PressEvent) => events.push(e),
    onPressEnd: (e: PressEvent) => events.push(e),
    onPressUp: (e: PressEvent) => events.push(e),
    onPress: (e: PressEvent) => events.push(e),
    onPressChange: (pressed: boolean) => events.push({type: 'presschange', pressed}),
  };
}

function omitKeys(e: object, keys: string[]): Record<string, unknown> {
  const copy: Record<string, unknown> = {...(e as Record<string, unknown>)};
  for (const k of keys) delete copy[k];
  return copy;
}

describe('Pressable', () => {
  describe('pointer events', () => {
    it('fires press events in order for pointerType=mouse', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          (pressStart)="onPressStart($event)"
          (pressEnd)="onPressEnd($event)"
          (pressUp)="onPressUp($event)"
          (press)="onPress($event)"
          (pressChange)="onPressChange($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.pointerDown(el, pointer('mouse'));
      fireEvent.pointerUp(el, pointer('mouse'));

      const types = cap.events.map((e) => e.type);
      expect(types).toEqual([
        'pressstart',
        'presschange',
        'pressup',
        'pressend',
        'presschange',
        'press',
      ]);

      const start = cap.events[0] as PressEvent;
      expect(omitKeys(start, ['target', 'key'])).toMatchObject({
        type: 'pressstart',
        pointerType: 'mouse',
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
      });
      expect(start.target).toBe(el);
    });

    it('reflects data-pressed between pointerdown and pointerup', async () => {
      const {fixture} = await render(`<div tersePressable>test</div>`, {
        imports: [TersePressable],
      });
      const el = screen.getByText('test');

      expect(el).not.toHaveAttribute('data-pressed');

      fireEvent.pointerDown(el, pointer('mouse'));
      fixture.detectChanges();
      expect(el).toHaveAttribute('data-pressed');

      fireEvent.pointerUp(el, pointer('mouse'));
      fixture.detectChanges();
      expect(el).not.toHaveAttribute('data-pressed');
    });

    it('fires pressstart again when re-entering the target while pressed', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          (pressStart)="onPressStart($event)"
          (pressEnd)="onPressEnd($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.pointerDown(el, pointer('mouse'));
      fireEvent.pointerLeave(el, pointer('mouse'));
      fireEvent.pointerEnter(el, pointer('mouse'));

      const types = cap.events.map((e) => e.type);
      expect(types).toEqual(['pressstart', 'pressend', 'pressstart']);
    });

    it('cancels press when pointer exits and shouldCancelOnPointerExit is set', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          [shouldCancelOnPointerExit]="true"
          (pressStart)="onPressStart($event)"
          (pressEnd)="onPressEnd($event)"
          (pressUp)="onPressUp($event)"
          (press)="onPress($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.pointerDown(el, pointer('mouse'));
      fireEvent.pointerLeave(el, pointer('mouse'));
      // pointerup comes from somewhere else entirely — we're no longer tracking
      fireEvent.pointerUp(document, pointer('mouse'));

      const types = cap.events.map((e) => e.type);
      expect(types).toEqual(['pressstart', 'pressend']);
      expect((cap.events[1] as PressEvent).type).toBe('pressend');
    });

    it('does not fire press when pointer released off-target', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          (pressEnd)="onPressEnd($event)"
          (press)="onPress($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.pointerDown(el, pointer('mouse'));
      fireEvent.pointerLeave(el, pointer('mouse'));
      fireEvent.pointerUp(document, pointer('mouse'));

      const types = cap.events.map((e) => e.type);
      expect(types).toContain('pressend');
      expect(types).not.toContain('press');
    });

    it('only handles left clicks', async () => {
      const cap = capturing();
      await render(
        `<div tersePressable (pressStart)="onPressStart($event)">test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.pointerDown(el, pointer('mouse', {button: 1}));
      expect(cap.events).toHaveLength(0);
    });

    it('cancels press on pointercancel', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          (pressEnd)="onPressEnd($event)"
          (press)="onPress($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.pointerDown(el, pointer('mouse'));
      fireEvent.pointerCancel(document, pointer('mouse'));

      const types = cap.events.map((e) => e.type);
      expect(types).toEqual(['pressend']);
    });

    it('cancels press on dragstart', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          draggable="true"
          (pressEnd)="onPressEnd($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.pointerDown(el, pointer('mouse'));
      fireEvent.dragStart(el);

      const types = cap.events.map((e) => e.type);
      expect(types).toEqual(['pressend']);
    });

    it('cancels press when disabled flips true mid-press', async () => {
      const cap = capturing();
      const {fixture, rerender} = await render(
        `<div
          tersePressable
          [disabled]="d"
          (pressEnd)="onPressEnd($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: {d: false, ...cap}},
      );
      const el = screen.getByText('test');

      fireEvent.pointerDown(el, pointer('mouse'));
      fixture.detectChanges();
      expect(el).toHaveAttribute('data-pressed');

      await rerender({componentProperties: {d: true, ...cap}});
      fixture.detectChanges();

      expect(el).not.toHaveAttribute('data-pressed');
      expect(cap.events.map((e) => e.type)).toEqual(['pressend']);
    });

    it('does not fire press events when disabled', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          disabled
          (pressStart)="onPressStart($event)"
          (press)="onPress($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.pointerDown(el, pointer('mouse'));
      fireEvent.pointerUp(document, pointer('mouse'));

      expect(cap.events).toHaveLength(0);
    });
  });

  describe('keyboard events', () => {
    it('fires press events for Space', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          role="button"
          (pressStart)="onPressStart($event)"
          (pressEnd)="onPressEnd($event)"
          (pressUp)="onPressUp($event)"
          (press)="onPress($event)"
          (pressChange)="onPressChange($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.keyDown(el, {key: ' '});
      fireEvent.keyUp(el, {key: ' '});

      const types = cap.events.map((e) => e.type);
      expect(types).toEqual([
        'pressstart',
        'presschange',
        'pressup',
        'pressend',
        'presschange',
        'press',
      ]);
      expect((cap.events[0] as PressEvent).pointerType).toBe('keyboard');
      expect((cap.events[0] as PressEvent).key).toBe(' ');
    });

    it('fires press events for Enter', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          role="button"
          (pressStart)="onPressStart($event)"
          (press)="onPress($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.keyDown(el, {key: 'Enter'});
      fireEvent.keyUp(el, {key: 'Enter'});

      const types = cap.events.map((e) => e.type);
      expect(types).toContain('pressstart');
      expect(types).toContain('press');
      expect((cap.events[0] as PressEvent).key).toBe('Enter');
    });

    it('ignores Space on role="link"', async () => {
      const cap = capturing();
      await render(
        `<a
          tersePressable
          role="link"
          href="#"
          (pressStart)="onPressStart($event)"
        >test</a>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.keyDown(el, {key: ' '});
      fireEvent.keyUp(el, {key: ' '});

      expect(cap.events).toHaveLength(0);
    });

    it('forwards modifier keys onto the press event', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          role="button"
          (pressStart)="onPressStart($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.keyDown(el, {key: ' ', shiftKey: true});

      const start = cap.events[0] as PressEvent;
      expect(start.shiftKey).toBe(true);
    });

    it('ignores repeating keyboard events', async () => {
      const cap = capturing();
      await render(
        `<div
          tersePressable
          role="button"
          (pressStart)="onPressStart($event)"
        >test</div>`,
        {imports: [TersePressable], componentProperties: cap},
      );
      const el = screen.getByText('test');

      fireEvent.keyDown(el, {key: ' '});
      fireEvent.keyDown(el, {key: ' ', repeat: true});

      expect(cap.events.filter((e) => e.type === 'pressstart')).toHaveLength(1);
    });
  });

  describe('isPressed controlled state', () => {
    it('forces data-pressed when set to true', async () => {
      await render(`<div tersePressable [isPressed]="true">test</div>`, {
        imports: [TersePressable],
      });
      const el = screen.getByText('test');
      expect(el).toHaveAttribute('data-pressed');
    });
  });
});
