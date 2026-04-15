import {Directive, inject} from '@angular/core';
import {Styles} from '@terse-ui/core/styles';
import {IdGenerator} from '@terse-ui/core/utils';

/** CSS custom ident written to `anchor-name` (`--anchor-N`). */
export type AnchorName = `--anchor-${number}`;

/** Assigns a CSS `anchor-name` to the host so it can be referenced by `Anchored`. */
@Directive({
  hostDirectives: [Styles],
})
export class Anchor {
  readonly #generator = inject(IdGenerator);
  readonly value = this.#generator.generate(`--anchor`);
  constructor() {
    inject(Styles).value.pipe(({next, current}) => next({...current, ['anchor-name']: this.value}));
  }
}
