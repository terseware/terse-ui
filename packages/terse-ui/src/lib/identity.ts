import {Directive, input} from '@angular/core';
import {hostAttr, statePipeline} from '@terse-ui/core/utils';

const ariaHasPopupTokens = ['false', 'true', 'menu', 'listbox', 'tree', 'grid', 'dialog'] as const;
const ariaHasPopupSet = new Set(ariaHasPopupTokens);
export type AriaHasPopupValue = (typeof ariaHasPopupTokens)[number];

@Directive({
  host: {
    '[attr.role]': 'role()',
    '[attr.type]': 'type()',
    '[aria-haspopup]': 'ariaHasPopup()',
    '[aria-roledescription]': 'ariaRoleDescription()',
  },
})
export class Identity {
  readonly _inputRole = input(hostAttr('role'), {alias: 'role'});
  readonly role = statePipeline(this._inputRole);

  readonly _inputType = input(hostAttr('type'), {alias: 'type'});
  readonly type = statePipeline(this._inputType);

  readonly _inputAriaHasPopup = input(hostAttr('aria-haspopup'), {alias: 'ariaHasPopup'});
  readonly ariaHasPopup = statePipeline<AriaHasPopupValue | null>(null, {
    finalize: (v) => (ariaHasPopupSet.has(v as never) ? v : null),
  });

  readonly _inputAriaRoleDescription = input(hostAttr('aria-roledescription'), {
    alias: 'ariaRoleDescription',
  });
  readonly ariaRoleDescription = statePipeline<string | null>(null);
}
