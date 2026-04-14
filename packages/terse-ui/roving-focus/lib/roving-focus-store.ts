import {effect, inject, type InputSignalWithTransform} from '@angular/core';
import {patchState, signalStore, withMethods, withProps, withState} from '@ngrx/signals';
import {addEntity, removeEntity, withEntities} from '@ngrx/signals/entities';
import {Orientation} from '@terse-ui/core/attributes';
import type {RovingFocusItem} from './roving-focus-item';

export const RovingFocusStore = signalStore(
  withEntities<RovingFocusItem>(),
  withState(() => ({
    enabled: true,
    wrap: true,
    homeEnd: true,
  })),
  withProps(() => ({
    orientation: inject(Orientation),
  })),
  withMethods((store) => ({
    registerItem(item: RovingFocusItem) {
      patchState(store, addEntity(item));
      return () => patchState(store, removeEntity(item.id));
    },
    linkInputs(inputs: {
      enabled: InputSignalWithTransform<boolean, unknown>;
      wrap: InputSignalWithTransform<boolean, unknown>;
      homeEnd: InputSignalWithTransform<boolean, unknown>;
    }) {
      effect(() => {
        patchState(store, {
          enabled: inputs.enabled(),
          wrap: inputs.wrap(),
          homeEnd: inputs.homeEnd(),
        });
      });
    },
  })),
);
