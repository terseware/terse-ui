import {afterNextRender, booleanAttribute, Directive, DOCUMENT, inject, input} from '@angular/core';
import {activeElement, listener, mutationObserver} from '@signality/core';
import {setupSync} from '@signality/core/browser/listener';
import {TabIndex} from '@terseware/ui/atoms';
import {injectElement} from '@terseware/ui/internal';
import {override} from '@terseware/ui/state';

const TABBABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'textarea',
  'select',
  'details',
  'iframe',
  'embed',
  'object',
  'summary',
  'dialog',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]',
  '[tabindex]',
].join(', ');

function isVisible(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) {
    return false;
  }
  if (el.hasAttribute('hidden')) {
    return false;
  }
  if (window.getComputedStyle(el).display === 'none') {
    return false;
  }
  return true;
}

/**
 * Traps Tab navigation inside the host subtree, cycling between its first
 * and last tabbable descendants. Redirects external `focusin` events back
 * inside and refocuses the container when the active element is removed.
 */
@Directive({
  exportAs: 'focusTrap',
  hostDirectives: [TabIndex],
  host: {
    '[attr.data-focus-trap]': 'enabled() ? "" : null',
    '(keydown)': 'onKeydown($event)',
  },
})
export class FocusTrap {
  readonly enabled = input(true, {transform: booleanAttribute, alias: 'focusTrapEnabled'});
  readonly autoFocus = input(false, {transform: booleanAttribute, alias: 'focusTrapAutoFocus'});

  readonly #element = injectElement();
  readonly #activeElement = activeElement();

  constructor() {
    override(TabIndex, () => (this.enabled() ? -1 : 0));

    afterNextRender(() => {
      if (this.autoFocus() && this.enabled()) {
        const [first] = this.#getTabbableEdges();
        first?.focus();
      }
    });

    mutationObserver(
      this.#element,
      () => {
        if (!this.enabled()) {
          return;
        }

        // If the focused element was removed, refocus the container
        if (!this.#element.contains(this.#activeElement())) {
          const [first] = this.#getTabbableEdges();
          if (first) {
            first.focus();
          } else {
            this.#element.focus();
          }
        }
      },
      {childList: true, subtree: true},
    );

    // Document-level listener — register synchronously so an early focusin
    // (e.g. between directive init and the next render tick) can't slip past.
    const doc = inject(DOCUMENT);
    setupSync(() =>
      listener.capture(doc, 'focusin', (event) => {
        if (!this.enabled()) {
          return;
        }

        const target = event.target as HTMLElement | null;
        if (!target || this.#element.contains(target)) {
          return;
        }

        // Redirect focus back inside the trap
        const [first] = this.#getTabbableEdges();
        if (first) {
          first.focus();
        } else {
          this.#element.focus();
        }
      }),
    );
  }

  #getTabbableEdges() {
    const candidates = this.#element.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR);
    const tabbable = Array.from(candidates).filter(isVisible);
    return [tabbable[0] ?? null, tabbable[tabbable.length - 1] ?? null];
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.enabled()) {
      return;
    }

    const [first, last] = this.#getTabbableEdges();
    if (!first || !last) {
      // No tabbable elements — prevent Tab from leaving
      event.preventDefault();
      return;
    }

    if (event.shiftKey && this.#activeElement() === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.#activeElement() === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
