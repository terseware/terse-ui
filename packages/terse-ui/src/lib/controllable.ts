import {computed, Directive, input} from '@angular/core';
import {hostAttr, statePipeline} from '@terse-ui/core/utils';

@Directive({host: {'[aria-controls]': 'domAriaControls()'}})
export class Controllable {
  readonly _inputValue = input<string[]>(
    hostAttr('aria-controls')?.split(/\s+/).filter(Boolean) ?? [],
    {alias: 'ariaControls'},
  );
  readonly #state = statePipeline(this._inputValue);
  readonly ariaControls = this.#state.asReadonly();
  protected readonly domAriaControls = computed(
    () =>
      this.ariaControls()
        .map((id) => id.trim())
        .filter(Boolean)
        .join(' ') || null,
  );

  registerIds(...value: string[]): () => void {
    return this.#state.pipe(({current, next}) => next([...current, ...value]));
  }
}
