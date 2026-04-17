import {Directive} from '@angular/core';
import {statePipeline, type StatePipelineInterceptOptions} from '@terse-ui/core/utils';

export type StylesState = Record<string, string | number | boolean | null | undefined>;

@Directive({host: {'[style]': 'state()'}})
export class Styles {
  readonly #state = statePipeline<StylesState>({});
  readonly state = this.#state.asReadonly();
  patch(
    patch: (incoming: StylesState) => Partial<StylesState>,
    opts?: StatePipelineInterceptOptions,
  ): () => void {
    return this.#state.intercept(({next, incoming}) => ({...next(), ...patch(incoming)}), opts);
  }
}
