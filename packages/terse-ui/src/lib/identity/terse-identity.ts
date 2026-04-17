import {Directive, inject} from '@angular/core';
import {Identity} from './identity';

export interface TerseIdentity extends Identity {}

/**
 * Applies hoverable behavior to any element.
 */
@Directive({
  selector: '[terseIdentity]',
  exportAs: 'terseIdentity',
  hostDirectives: [
    {
      directive: Identity,
      inputs: ['role', 'type', 'ariaHasPopup', 'ariaRoleDescription'],
    },
  ],
})
export class TerseIdentity {
  constructor() {
    return inject(Identity);
  }
}
