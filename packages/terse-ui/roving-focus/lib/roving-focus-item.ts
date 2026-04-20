import {DestroyRef, Directive, forwardRef, inject} from '@angular/core';
import {Base, Focusable, hostKeyEvent} from '@terse-ui/core';
import {injectElement} from '@terse-ui/utils';
import {RovingFocus} from './roving-focus';

@Directive({
  hostDirectives: [Base, Focusable],
})
export class RovingFocusItem {
  readonly #element = injectElement();
  readonly #focusable = inject(Focusable);
  readonly isActive = this.#focusable.isActiveElement;
  readonly #base = this.#focusable.base;
  readonly hardDisabled = this.#base.hardDisabled;
  readonly softDisabled = this.#base.softDisabled;

  readonly group = inject(
    forwardRef(() => RovingFocus),
    {skipSelf: true},
  ) as RovingFocus;

  readonly leaf = inject(
    forwardRef(() => RovingFocus),
    {optional: true, self: true},
  ) as RovingFocus | null;

  focus(): void {
    this.#focusable.focusElement('keyboard');
  }

  compareDocumentPosition(other: RovingFocusItem): number {
    return this.#element.compareDocumentPosition(other.#element);
  }

  constructor() {
    inject(DestroyRef).onDestroy(this.group.registerItem(this));
    this.#focusable.tabIndex.intercept(() => (this.group.tabStop() === this ? 0 : -1));

    hostKeyEvent('Home', () => this.group.firstItem()?.focus());
    hostKeyEvent('End', () => this.group.lastItem()?.focus());

    hostKeyEvent(
      () => (this.group.vertical() ? 'ArrowDown' : 'ArrowRight'),
      () => this.group.nextItem()?.focus(),
      {ignoreRepeat: false},
    );

    hostKeyEvent(
      () => (this.group.vertical() ? 'ArrowUp' : 'ArrowLeft'),
      () => this.group.previousItem()?.focus(),
      {ignoreRepeat: false},
    );

    hostKeyEvent(
      () => (this.group.vertical() ? 'ArrowRight' : 'ArrowDown'),
      () => this.leaf?.firstItem()?.focus(),
      {when: () => !this.leaf?.base.disabled()},
    );

    hostKeyEvent(
      () => (this.group.vertical() ? 'ArrowLeft' : 'ArrowUp'),
      () => (this.group.parent?.lastActiveItem() ?? this.group.parent?.firstItem())?.focus(),
      {when: () => !!this.group.parent},
    );
  }
}
