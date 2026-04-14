import {
  booleanAttribute,
  computed,
  contentChildren,
  Directive,
  inject,
  input,
  signal,
} from '@angular/core';
import {Keys} from '@terseware/ui/atoms';
import {HostAttributes, injectElement} from '@terseware/ui/internal';
import {RovingFocusItem} from './roving-focus-item';

/** Orientation input accepted by `RovingFocus`. */
export type RovingFocusOrientation = 'horizontal' | 'vertical';

/**
 * ARIA roles for which `aria-orientation` is a supported attribute. The
 * directive only reflects `aria-orientation` onto the host when the host
 * carries one of these roles; setting the attribute on a plain `<div>`
 * with no role is an axe `aria-allowed-attr` violation because the
 * attribute has no meaning there. Roving focus is a *behavior*, not a
 * widget role — the role comes from the consumer (toolbar, tablist, ...).
 */
const ORIENTATION_BEARING_ROLES: ReadonlySet<string> = new Set([
  'listbox',
  'menu',
  'menubar',
  'radiogroup',
  'scrollbar',
  'select',
  'separator',
  'slider',
  'tablist',
  'toolbar',
  'tree',
]);

/**
 * Roving-tabindex container. Wires arrow keys (orientation-aware) plus
 * `Home`/`End` to walk through child {@link RovingFocusItem}s, skipping
 * hard-disabled items and optionally wrapping at the ends.
 *
 * Exactly one item in the group is the **tab stop** at any time — it
 * exposes `tabindex=0` to the outer tab order, while every other item
 * gets `tabindex=-1`. The tab stop defaults to the first non-hard-disabled
 * item and moves to whichever item most recently received focus. This
 * matches the WAI-ARIA APG guidance for composite widgets using roving
 * tabindex: the group itself must always have exactly one reachable
 * keyboard landing spot.
 *
 * Soft-disabled items stay in the traversal order so a user can still
 * land on them with the keyboard — activation is blocked separately by
 * `Disabler` itself. Hard-disabled items are skipped entirely.
 */
@Directive({
  selector: '[rovingFocus]:not([unterse-rovingFocus]):not([unterse])',
  exportAs: 'rovingFocus',
  hostDirectives: [Keys],
  host: {
    '[attr.aria-orientation]': 'ariaOrientation()',
  },
})
export class RovingFocus {
  readonly enabled = input(true, {alias: 'rovingFocus', transform: booleanAttribute});
  readonly wrap = input(true, {alias: 'rovingFocusWrap', transform: booleanAttribute});
  readonly homeEnd = input(true, {alias: 'rovingFocusHomeEnd', transform: booleanAttribute});

  readonly orientation = input<RovingFocusOrientation>(
    (inject(HostAttributes).get('orientation') as RovingFocusOrientation | null) ?? 'vertical',
  );

  readonly items = contentChildren(RovingFocusItem, {descendants: true});

  readonly #element = injectElement();
  readonly #lastFocused = signal<RovingFocusItem | null>(null);

  /**
   * Value written to `aria-orientation`. `null` (attribute removed) when the
   * host has no orientation-bearing role, because `aria-orientation` is
   * invalid on elements that don't support it.
   */
  readonly ariaOrientation = computed<RovingFocusOrientation | null>(() => {
    const role = this.#element.getAttribute('role');
    if (!role || !ORIENTATION_BEARING_ROLES.has(role)) return null;
    return this.orientation();
  });

  /**
   * The item that owns the group's single `tabindex=0` tab stop. Defaults
   * to the first non-hard-disabled item so the group is Tab-reachable from
   * the outer focus order; moves to whichever item most recently took
   * focus (keyboard or programmatic).
   */
  readonly tabStop = computed<RovingFocusItem | null>(() => {
    const last = this.#lastFocused();
    const items = this.items();
    if (last && items.includes(last) && !last.hardDisabled()) {
      return last;
    }
    return items.find((item) => !item.hardDisabled()) ?? null;
  });

  constructor() {
    const keys = inject(Keys);

    const whenVertical = () => this.enabled() && this.orientation() === 'vertical';
    const whenHorizontal = () => this.enabled() && this.orientation() === 'horizontal';
    const whenHomeEnd = () => this.enabled() && this.homeEnd();

    // Arrow keys are registered unconditionally; `when` gates them by
    // orientation so the off-axis pair is a no-op (and their preventDefault
    // / stopPropagation don't fire, letting the event bubble naturally).
    keys.down('ArrowUp', () => this.focusPrev(), {when: whenVertical, ignoreRepeat: false});
    keys.down('ArrowDown', () => this.focusNext(), {when: whenVertical, ignoreRepeat: false});
    keys.down('ArrowLeft', () => this.focusPrev(), {when: whenHorizontal, ignoreRepeat: false});
    keys.down('ArrowRight', () => this.focusNext(), {when: whenHorizontal, ignoreRepeat: false});

    keys.down('Home', () => this.focusFirst(), {when: whenHomeEnd});
    keys.down('End', () => this.focusLast(), {when: whenHomeEnd});
  }

  /** Called by items when they take focus so the tab stop follows along. */
  claimTabStop(item: RovingFocusItem): void {
    this.#lastFocused.set(item);
  }

  focusFirst(): void {
    this.#step(-1, 1)?.focus();
  }

  focusLast(): void {
    this.#step(this.items().length, -1)?.focus();
  }

  focusNext(): void {
    this.#step(this.#currentIndex(), 1)?.focus();
  }

  focusPrev(): void {
    this.#step(this.#currentIndex(), -1)?.focus();
  }

  /** Index of the item that currently owns DOM focus, or `-1` if none. */
  #currentIndex(): number {
    const active = document.activeElement;
    return this.items().findIndex((item) => item.element === active);
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
