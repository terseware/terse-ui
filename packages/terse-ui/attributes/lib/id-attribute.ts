import {Directive, inject} from '@angular/core';
import {IdGenerator} from '@terse-ui/core/utils';

@Directive({host: {'[id]': 'value'}})
export class IdAttribute {
  readonly value = inject(IdGenerator).generate('id');
}
