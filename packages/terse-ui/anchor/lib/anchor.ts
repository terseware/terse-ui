import {Directive, inject} from '@angular/core';
import {Base} from '@terse-ui/core';
import {IdGenerator} from '@terse-ui/utils';

/** CSS custom ident written to `anchor-name` (`--anchor-N`). */
export type AnchorName = `--anchor-${number}`;

/** Assigns a CSS `anchor-name` to the host so it can be referenced by `Anchored`. */
@Directive({
  hostDirectives: [Base],
})
export class Anchor {
  readonly base = inject(Base);
  readonly #generator = inject(IdGenerator);
  readonly value = this.#generator.generate(`--anchor`);
  constructor() {
    this.base.patchStyles(() => ({['anchor-name']: this.value}));
  }
}
