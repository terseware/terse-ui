import {Directive, inject, input, linkedSignal} from '@angular/core';
import {IdGenerator, configBuilder} from '@terseware/ui/internal';
import {State} from '@terseware/ui/state';

/** CSS custom ident written to `anchor-name` (`--anchor-N`). */
export type AnchorName = `--anchor-${number}`;

/** Prefix options for the generated anchor name. */
export interface AnchorNameOpts {
  prefix: string;
}

const [provideAnchorNameOpts, injectAnchorNameOpts] = configBuilder<AnchorNameOpts>(
  'AnchorName',
  {prefix: 'anchor'},
  (contribs, {prefix}) => ({prefix: contribs.map((c) => c.prefix).join('-') || prefix}),
);

export {provideAnchorNameOpts};

/** Assigns a CSS `anchor-name` to the host so it can be referenced by `Anchored`. */
@Directive({
  exportAs: 'anchor',
  host: {
    '[style.anchor-name]': 'value()',
  },
})
export class Anchor extends State<AnchorName> {
  readonly #opts = injectAnchorNameOpts();
  readonly prefix = input(this.#opts.prefix, {alias: 'anchorNamePrefix'});

  constructor() {
    const generator = inject(IdGenerator);
    super(linkedSignal(() => generator.generate(`--anchor`)));
  }
}
