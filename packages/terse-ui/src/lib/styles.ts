import {Directive} from '@angular/core';
import {statePipeline, type PipelinePipeOptions} from '@terse-ui/core/utils';

export type StylesState = Record<string, string | number | boolean | null | undefined>;

@Directive({host: {'[style]': 'state()'}})
export class Styles {
  readonly #state = statePipeline<StylesState>({});
  readonly state = this.#state.asReadonly();
  patch(patch: Partial<StylesState>, opts?: PipelinePipeOptions): () => void {
    return this.#state.pipe(({next, current}) => next({...current, ...patch}), opts);
  }
}
