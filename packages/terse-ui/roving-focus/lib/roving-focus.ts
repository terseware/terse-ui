import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  inject,
  input,
  signal,
  type InputSignalWithTransform,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {Base, Orientation, provideBaseConfig} from '@terse-ui/core';
import {injectElement, isNil, SignalSet} from '@terse-ui/utils';
import {type RovingFocusItem} from './roving-focus-item';

@Directive({
  hostDirectives: [Base, Orientation],
  providers: [provideBaseConfig({inheritDisabled: true})],
})
export class RovingFocus {
  readonly element = injectElement();
  readonly parent = inject(RovingFocus, {optional: true, skipSelf: true});
  readonly base = inject(Base);

  readonly #initWrap = this.parent?.wrap() ?? true;
  readonly wrap: InputSignalWithTransform<boolean, unknown> = input(this.#initWrap, {
    transform: (v) => (isNil(v) ? this.#initWrap : booleanAttribute(v)),
  });

  readonly orientation = inject(Orientation).orientation;
  readonly horizontal = computed(() => this.orientation() === 'horizontal');
  readonly vertical = computed(() => !this.horizontal());

  readonly #itemsFromRoot: SignalSet<RovingFocusItem> = this.parent
    ? this.parent.#itemsFromRoot
    : new SignalSet();
  registerItem(item: RovingFocusItem): () => void {
    this.#itemsFromRoot.add(item);
    return () => this.#itemsFromRoot.delete(item);
  }

  readonly itemsFromRoot = computed(() =>
    this.#itemsFromRoot
      .values()
      .filter((item) => !item.hardDisabled())
      .toArray()
      .sort((a, b) => {
        if (a === b) return 0;
        const pos = a.compareDocumentPosition(b);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      }),
  );

  readonly activeItemFromRoot = computed(
    () => this.#itemsFromRoot.values().find((item) => item.isActive()) ?? null,
  );
  readonly #lastActiveItemFromRoot: WritableSignal<RovingFocusItem | null> = this.parent
    ? this.parent.#lastActiveItemFromRoot
    : signal<RovingFocusItem | null>(null);
  readonly lastActiveItemFromRoot = computed(() => {
    const item = this.#lastActiveItemFromRoot();
    if (item && this.itemsFromRoot().includes(item)) return item;
    return null;
  });

  readonly items = computed(() => this.itemsFromRoot().filter((item) => item.group === this));
  readonly size = computed(() => this.items().length);
  readonly activeIndex = computed(() => this.items().findIndex((item) => item.isActive()));
  readonly activeItem = computed(() => this.items()[this.activeIndex()] ?? null);
  readonly firstItem = computed(() => this.items().at(0) ?? null);
  readonly lastItem = computed(() => this.items().at(-1) ?? null);

  readonly #lastActiveItem = signal<RovingFocusItem | null>(null);
  readonly lastActiveItem = computed(() => {
    const item = this.#lastActiveItem();
    if (item && this.items().includes(item)) return item;
    return null;
  });

  readonly nextItem = computed(() => {
    const idx = this.activeIndex() < 0 ? -1 : this.activeIndex();
    const nextItem = this.items().at((idx + 1) % this.size()) ?? null;
    if (!this.wrap() && nextItem === this.firstItem()) return null;
    return nextItem;
  });

  readonly previousItem = computed(() => {
    const idx = this.activeIndex() < 0 ? 0 : this.activeIndex();
    const previousItem = this.items().at((idx - 1) % this.size()) ?? null;
    if (!this.wrap() && previousItem === this.lastItem()) return null;
    return previousItem;
  });

  readonly tabStop: Signal<RovingFocusItem | null> = computed(() => {
    if (this.base.disabled()) return null;
    if (this.parent) return this.parent.tabStop();
    return this.lastActiveItemFromRoot() ?? this.firstItem();
  });

  constructor() {
    effect(() => {
      const active = this.activeItem();
      if (active) {
        this.#lastActiveItem.set(active);
      }
    });

    if (!this.parent) {
      effect(() => {
        const active = this.activeItemFromRoot();
        if (active) {
          this.#lastActiveItemFromRoot.set(active);
        }
      });
    }
  }
}
