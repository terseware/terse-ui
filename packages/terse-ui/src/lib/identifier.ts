import {Directive, inject} from '@angular/core';
import {IdGenerator} from '@terse-ui/core/utils';

export type IdentifierValue = `id-${number}`;

@Directive({host: {'[id]': 'value'}})
export class Identifier {
  readonly value: IdentifierValue = inject(IdGenerator).generate('id');
}
