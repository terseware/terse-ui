import {computed, Directive, input} from '@angular/core';
import {hostAttr, notNil, statePipeline} from '@terse-ui/utils';

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

  register(fn: () => string | null | undefined): () => void {
    return this.#state.intercept(({next}) => {
      const id = fn();
      const current = next();
      return notNil(id) ? [...current, id] : current;
    });
  }
}
