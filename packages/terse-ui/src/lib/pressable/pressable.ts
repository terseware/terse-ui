import {
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  inject,
  model,
  output,
  signal,
} from '@angular/core';
import {listener, watcher} from '@signality/core';
import {
  OnClick,
  OnKeyDown,
  OnPointerDown,
  OnPointerEnter,
  OnPointerLeave,
} from '@terse-ui/core/events';
import {injectElement, isNode} from '@terse-ui/core/utils';
import {Focusable} from '../focusable/focusable';

export type PressPointerType = 'mouse' | 'touch' | 'pen' | 'keyboard' | 'virtual';

export interface PressEvent {
  type: 'pressstart' | 'pressend' | 'press' | 'pressup';
  pointerType: PressPointerType;
  target: Element;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  x: number;
  y: number;
  key?: string;
}

interface EventBase {
  currentTarget: EventTarget | null;
  target: EventTarget | null;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  clientX?: number;
  clientY?: number;
  key?: string;
}

/**
 * Handles press interactions across mouse, touch, keyboard, and screen
 * readers. Ported from react-aria's `usePress`.
 *
 * Emits `pressStart`, `pressUp`, `pressEnd`, `press`, and `pressChange`,
 * reflects `data-pressed` on the host, and cancels the press when the host
 * becomes disabled, the pointer is cancelled, or drag starts.
 */
@Directive({
  hostDirectives: [Focusable, OnPointerDown, OnPointerEnter, OnPointerLeave, OnKeyDown, OnClick],
  host: {
    '[attr.data-pressed]': "pressed() ? '' : null",
  },
})
export class Pressable {
  readonly #el = injectElement();
  readonly #doc = inject(DOCUMENT);
  readonly #focusable = inject(Focusable);

  /** Controlled press state. When set, overrides the internal `pressed` signal. */
  readonly isPressed = model<boolean>();

  /**
   * Whether to cancel the press when the pointer leaves the target.
   * When false, re-entering while still pressed restarts press.
   * @default false
   */
  readonly shouldCancelOnPointerExit = model(false);

  readonly #pressed = signal(false);
  readonly pressed = computed(
    () => !this.#focusable.disabled() && (this.isPressed() ?? this.#pressed()),
  );

  readonly pressChange = output<boolean>();
  readonly pressStart = output<PressEvent>();
  readonly pressEnd = output<PressEvent>();
  readonly press = output<PressEvent>();
  readonly pressUp = output<PressEvent>();

  readonly #target = signal<Element | null>(null);
  readonly #pointerType = signal<PressPointerType | null>(null);
  readonly #isOverTarget = signal(false);
  readonly #activePointerId = signal<number | null>(null);
  readonly #didFirePressStart = signal(false);

  #globalDisposers: Array<() => void> = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#clearGlobalListeners());

    // Cancel any in-flight press when disabled flips true.
    watcher(this.#focusable.disabled, (disabled) => {
      if (disabled) this.#cancel();
    });

    inject(OnPointerDown).pipe(({event, next}) => {
      if (event.button === 0 && this.#nodeContains(event.currentTarget, event.target)) {
        this.#onPointerDown(event);
      }
      next();
    });

    inject(OnPointerEnter).pipe(({event, next}) => {
      if (
        event.pointerId === this.#activePointerId() &&
        this.#target() &&
        !this.#isOverTarget() &&
        this.#pointerType()
      ) {
        this.#isOverTarget.set(true);
        this.#triggerPressStart(event, this.#pointerType() as PressPointerType);
      }
      next();
    });

    inject(OnPointerLeave).pipe(({event, next}) => {
      if (
        event.pointerId === this.#activePointerId() &&
        this.#target() &&
        this.#isOverTarget() &&
        this.#pointerType()
      ) {
        this.#isOverTarget.set(false);
        this.#triggerPressEnd(event, this.#pointerType() as PressPointerType, false);
        if (this.shouldCancelOnPointerExit()) this.#cancel();
      }
      next();
    });

    listener(this.#el, 'dragstart', () => this.#cancel());

    inject(OnKeyDown).pipe(({event, next}) => {
      if (
        this.#isValidKeyboardEvent(event, event.currentTarget as Element) &&
        this.#nodeContains(event.currentTarget, event.target) &&
        !event.repeat &&
        !this.#pressed()
      ) {
        event.preventDefault();
        this.#onKeyDown(event);
      }
      next();
    });

    inject(OnClick).pipe(({event, next}) => {
      if (
        event.button === 0 &&
        !this.#pressed() &&
        this.#pointerType() !== 'keyboard' &&
        this.#nodeContains(event.currentTarget, event.target) &&
        this.#isVirtualClick(event)
      ) {
        // Screen reader / element.click() — synthesize full press lifecycle.
        this.#triggerPressStart(event, 'virtual');
        this.#triggerPressUp(event, 'virtual');
        this.#triggerPressEnd(event, 'virtual', true);
      }
      next();
    });
  }

  #onPointerDown(event: PointerEvent): void {
    if (this.#focusable.disabled() || this.#pressed()) return;

    const pointerType = this.#resolvePointerType(event.pointerType);
    this.#pointerType.set(pointerType);
    this.#activePointerId.set(event.pointerId);
    this.#target.set(event.currentTarget as Element);
    this.#isOverTarget.set(true);
    this.#pressed.set(true);

    this.#triggerPressStart(event, pointerType);

    // Release pointer capture so pointerenter/leave fire when the touch moves.
    const t = event.target as Element & {
      hasPointerCapture?: (id: number) => boolean;
      releasePointerCapture?: (id: number) => void;
    };
    try {
      if (t?.hasPointerCapture?.(event.pointerId)) {
        t.releasePointerCapture?.(event.pointerId);
      }
    } catch {
      // no-op in environments without pointer capture
    }

    this.#addGlobal('pointerup', (e) => this.#onDocumentPointerUp(e as PointerEvent));
    this.#addGlobal('pointercancel', (e) => this.#onDocumentPointerCancel(e as PointerEvent));
  }

  #onDocumentPointerUp(event: PointerEvent): void {
    if (
      event.pointerId !== this.#activePointerId() ||
      !this.#pressed() ||
      event.button !== 0 ||
      !this.#target()
    ) {
      return;
    }

    const target = this.#target() as Element;
    const pointerType = (this.#pointerType() ?? 'mouse') as PressPointerType;
    const overTarget = this.#nodeContains(target, event.target);

    if (overTarget) {
      this.#triggerPressUp(event, pointerType);
      this.#triggerPressEnd(event, pointerType, true);
    } else {
      this.#triggerPressEnd(event, pointerType, false);
    }

    this.#isOverTarget.set(false);
    this.#reset();
  }

  #onDocumentPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.#activePointerId()) return;
    this.#cancel(event);
  }

  #onKeyDown(event: KeyboardEvent): void {
    this.#target.set(event.currentTarget as Element);
    this.#pointerType.set('keyboard');
    this.#pressed.set(true);

    this.#triggerPressStart(event, 'keyboard');

    this.#addGlobal('keyup', (e) => this.#onDocumentKeyUp(e as KeyboardEvent), true);
  }

  #addGlobal(type: string, handler: (e: Event) => void, capture = false): void {
    this.#doc.addEventListener(type, handler, capture);
    this.#globalDisposers.push(() => this.#doc.removeEventListener(type, handler, capture));
  }

  #clearGlobalListeners(): void {
    for (const dispose of this.#globalDisposers) dispose();
    this.#globalDisposers = [];
  }

  #onDocumentKeyUp(event: KeyboardEvent): void {
    const target = this.#target();
    if (!target || !this.#pressed()) return;
    if (!this.#isValidKeyboardEvent(event, target)) return;

    const wasPressed = this.#nodeContains(target, event.target);
    this.#triggerPressUp(event, 'keyboard');
    this.#triggerPressEnd(event, 'keyboard', wasPressed);

    this.#reset();
  }

  #triggerPressStart(event: EventBase, pointerType: PressPointerType): void {
    if (this.#focusable.disabled() || this.#didFirePressStart()) return;
    this.#didFirePressStart.set(true);
    this.#pressed.set(true);
    this.pressStart.emit(this.#buildEvent('pressstart', pointerType, event));
    this.pressChange.emit(true);
  }

  #triggerPressEnd(event: EventBase, pointerType: PressPointerType, wasPressed: boolean): void {
    if (!this.#didFirePressStart()) return;
    this.#didFirePressStart.set(false);
    this.pressEnd.emit(this.#buildEvent('pressend', pointerType, event));
    this.#pressed.set(false);
    this.pressChange.emit(false);

    if (wasPressed && !this.#focusable.disabled()) {
      this.press.emit(this.#buildEvent('press', pointerType, event));
    }
  }

  #triggerPressUp(event: EventBase, pointerType: PressPointerType): void {
    if (this.#focusable.disabled()) return;
    this.pressUp.emit(this.#buildEvent('pressup', pointerType, event));
  }

  #cancel(event?: EventBase): void {
    if (!this.#pressed() && !this.#didFirePressStart()) return;
    const target = this.#target();
    const pointerType = this.#pointerType();
    if (target && pointerType) {
      this.#triggerPressEnd(event ?? this.#syntheticEvent(target), pointerType, false);
    }
    this.#reset();
  }

  #reset(): void {
    this.#pressed.set(false);
    this.#isOverTarget.set(false);
    this.#activePointerId.set(null);
    this.#pointerType.set(null);
    this.#target.set(null);
    this.#clearGlobalListeners();
  }

  #buildEvent(
    type: PressEvent['type'],
    pointerType: PressPointerType,
    event: EventBase,
  ): PressEvent {
    const target = (this.#target() ?? (event.currentTarget as Element)) as Element;
    const rect = target?.getBoundingClientRect?.();
    let x = 0;
    let y = 0;
    if (rect) {
      if (event.clientX != null && event.clientY != null) {
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
      } else {
        x = rect.width / 2;
        y = rect.height / 2;
      }
    }
    return {
      type,
      pointerType,
      target,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      x,
      y,
      key: event.key as string,
    };
  }

  #syntheticEvent(target: Element): EventBase {
    return {
      currentTarget: target,
      target,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    };
  }

  #resolvePointerType(pointerType: string): PressPointerType {
    switch (pointerType) {
      case 'mouse':
      case 'touch':
      case 'pen':
        return pointerType;
      default:
        return 'mouse';
    }
  }

  #isValidKeyboardEvent(event: KeyboardEvent, target: Element): boolean {
    const key = event.key;
    if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return false;

    // Don't hijack typing inside form controls.
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target as HTMLElement).isContentEditable
    ) {
      return false;
    }

    const role = target.getAttribute('role');
    const isAnchorLink = target instanceof HTMLAnchorElement && target.hasAttribute('href');

    // Anchors with href handle Enter natively; Space is only relevant when
    // the element has role="button".
    if (isAnchorLink && !(role === 'button' && key !== 'Enter')) return false;

    // role="link" should only activate on Enter, mirroring anchor behavior.
    if (role === 'link' && key !== 'Enter') return false;

    return true;
  }

  #isVirtualClick(event: MouseEvent): boolean {
    // A screen reader or programmatic `element.click()` call produces a click
    // event that has no prior pointerdown and typically zero detail/buttons.
    return (
      event.detail === 0 &&
      (event as MouseEvent).clientX === 0 &&
      (event as MouseEvent).clientY === 0
    );
  }

  #nodeContains(node: unknown, otherNode: unknown): boolean {
    return isNode(node) && isNode(otherNode) && node.contains(otherNode);
  }
}
