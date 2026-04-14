import {booleanAttribute, Directive, inject, input, linkedSignal} from '@angular/core';
import {Orientation} from '@terse-ui/core/attributes';
import {
  addEntity,
  emptyCollection,
  removeEntity,
  State,
  type EntityCollection,
} from '@terse-ui/core/state';
import type {RovingFocusItem} from './roving-focus-item';

interface RovingFocusInnerState {
  enabled: boolean;
  wrap: boolean;
  homeEnd: boolean;
  items: EntityCollection<RovingFocusItem>;
}

export interface RovingFocusState {
  enabled: boolean;
  wrap: boolean;
  homeEnd: boolean;
}

function selectId(item: RovingFocusItem): string {
  return item.id;
}

@Directive({
  exportAs: 'rovingFocus',
  hostDirectives: [Orientation],
})
export class RovingFocus extends State<RovingFocusInnerState, RovingFocusState> {
  readonly enabled = input(true, {transform: booleanAttribute});
  readonly wrap = input(true, {transform: booleanAttribute});
  readonly homeEnd = input(true, {transform: booleanAttribute});
  readonly #orientation = inject(Orientation);
  readonly orientation = this.#orientation.state.value;

  constructor() {
    super(
      linkedSignal(() => ({
        enabled: this.enabled(),
        wrap: this.wrap(),
        homeEnd: this.homeEnd(),
        items: emptyCollection(),
      })),
      {
        transform: (value: RovingFocusInnerState) => ({
          enabled: value.enabled,
          wrap: value.wrap,
          homeEnd: value.homeEnd,
        }),
      },
    );
  }

  addItem(item: RovingFocusItem): () => void {
    this.updateState((s) => ({...s, items: addEntity(s.items, item, selectId)}));
    return () => this.updateState((s) => ({...s, items: removeEntity(s.items, selectId(item))}));
  }
}
