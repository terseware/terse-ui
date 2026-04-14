import type {Signal} from '@angular/core';
import {StatePipeline} from '@terse-ui/core/state';
import {isNil} from '@terse-ui/core/utils';

export interface AttributeState<TState> {
  value: TState;
  domValue: string | null;
}

export abstract class AttributePipeline<
  const TState = string | number | boolean | null,
> extends StatePipeline<TState, AttributeState<TState>> {
  constructor(
    initial: TState | Signal<TState>,
    toDomValue: (value: TState) => AttributeState<TState>['domValue'],
  ) {
    super(initial, {
      transform: (value: TState) => {
        const domValue = toDomValue(value);
        return {
          value: value,
          domValue: isNil(domValue) ? null : String(value),
        } satisfies AttributeState<TState>;
      },
    } as never);
  }
}
