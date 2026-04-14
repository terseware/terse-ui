import {Directive, inject, signal} from '@angular/core';
import {IdGenerator, configBuilder} from '@terseware/ui/internal';
import {State} from '@terseware/ui/state';

/** Generated id in the form `${prefix}-${number}`. */
export type IdentifierValue = `${string}-${number}`;

/** Prefix configuration for {@link Identifier}. */
export interface IdentifierOpts {
  prefix: string;
}

const [provideIdentifierOpts, injectIdentifierOpts] = configBuilder<IdentifierOpts>(
  'Identifier',
  {prefix: 'terse'},
  (contribs, {prefix}) => ({prefix: contribs.map((c) => c.prefix).join('-') || prefix}),
);

export {provideIdentifierOpts};

/** Assigns a unique, reactive `id` to the host element. */
@Directive({
  exportAs: 'terseIdentifier',
  host: {
    '[id]': 'value()',
  },
})
export class Identifier extends State<string, IdentifierValue> {
  constructor() {
    const generator = inject(IdGenerator);
    super(signal(injectIdentifierOpts().prefix), (p) => generator.generate(p));
  }

  setPrefix(prefix: string) {
    this.set(prefix);
  }
}
