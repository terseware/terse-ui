import {booleanAttribute, computed, Directive, inject, input, signal} from '@angular/core';
import {activeElement} from '@signality/core';
import {Orientation} from '@terse-ui/core';
import {OnKeyDown} from '@terse-ui/core/events';
import {SignalMap} from 'ngxtension/collections';
import type {RovingFocusItem} from './roving-focus-item';

@Directive({
  hostDirectives: [Orientation, OnKeyDown],
})
export class RovingFocus {
  readonly enabled = input(true, {alias: 'rovingFocusEnabled', transform: booleanAttribute});
  readonly wrap = input(true, {alias: 'rovingFocusWrap', transform: booleanAttribute});
  readonly homeEnd = input(true, {alias: 'rovingFocusHomeEnd', transform: booleanAttribute});

  readonly #items = new SignalMap<string, RovingFocusItem>();
  readonly itemsSize = computed(() => this.#items.size);
  readonly items = computed(() => {
    const arr = Array.from(this.#items.values());
    return arr.sort((a, b) => {
      if (a === b) return 0;
      const pos = a.element.compareDocumentPosition(b.element);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  });
  readonly #lastFocused = signal<RovingFocusItem | null>(null);
  readonly lastFocused = this.#lastFocused.asReadonly();
  readonly #activeElement = activeElement();
  readonly activeItem = computed(() =>
    this.items().find((item) => item.element === this.#activeElement()),
  );
  readonly currentIndex = computed(() =>
    this.items().findIndex((item) => item.element === this.#activeElement()),
  );

  readonly #onKeyDown = inject(OnKeyDown);
  readonly #orientation = inject(Orientation).state;
  readonly orientation = this.#orientation.asReadonly();
  readonly isVertical = computed(() => this.orientation() === 'vertical');
  readonly isHorizontal = computed(() => this.orientation() === 'horizontal');

  readonly tabStop = computed<RovingFocusItem | null>(() => {
    const last = this.#lastFocused();
    if (last && this.#items.has(last.id) && !last.hardDisabled()) return last;
    return this.items().find((item) => !item.hardDisabled()) ?? null;
  });

  constructor() {
    this.#orientation.intercept(({current, next}) => next(current ?? 'vertical'));
    this.#onKeyDown.intercept(({event, next, preventDefault}) => {
      if (!this.enabled()) {
        next();
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
          if (this.isVertical()) {
            preventDefault();
            this.focusPrev();
          }
          break;
        case 'ArrowDown':
          if (this.isVertical()) {
            preventDefault();
            this.focusNext();
          }
          break;

        case 'ArrowLeft':
          if (this.isHorizontal()) {
            preventDefault();
            this.focusPrev();
          }
          break;
        case 'ArrowRight':
          if (this.isHorizontal()) {
            preventDefault();
            this.focusNext();
          }
          break;

        case 'Home':
          if (this.homeEnd()) {
            preventDefault();
            this.focusFirst();
          }
          break;
        case 'End':
          if (this.homeEnd()) {
            preventDefault();
            this.focusLast();
          }
          break;
      }

      next();
    });
  }

  registerItem(item: RovingFocusItem): () => void {
    this.#items.set(item.id, item);
    return () => this.#items.delete(item.id);
  }

  claimTabStop(item: RovingFocusItem): void {
    this.#lastFocused.set(item);
  }

  focusFirst(): void {
    this.#step(-1, 1)?.focusItem();
  }

  focusLast(): void {
    this.#step(this.items().length, -1)?.focusItem();
  }

  focusNext(): void {
    this.#step(this.currentIndex(), 1)?.focusItem();
  }

  focusPrev(): void {
    this.#step(this.currentIndex(), -1)?.focusItem();
  }

  /**
   * Step from `from` in direction `dir` until we land on a non-hard-disabled
   * item, or exhaust the list. Wrap-aware: if `wrap` is on, walks around
   * the ends; if off, stops at the boundary. Returns `undefined` when no
   * reachable item exists (empty list, all disabled, or hit the boundary).
   */
  #step(from: number, dir: 1 | -1): RovingFocusItem | undefined {
    const items = this.items();
    const n = items.length;
    if (n === 0) return undefined;

    const wrap = this.wrap();
    for (let i = 1; i <= n; i++) {
      let idx = from + dir * i;
      if (wrap) {
        idx = ((idx % n) + n) % n;
      } else if (idx < 0 || idx >= n) {
        return undefined;
      }
      if (!items[idx]?.hardDisabled()) return items[idx];
    }
    return undefined;
  }
}
