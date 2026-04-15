import {Directive, input, isDevMode} from '@angular/core';
import {injectElement, statePipeline} from '@terse-ui/core/utils';

export type OrientationState = 'vertical' | 'horizontal' | null;

@Directive({
  host: {
    '[attr.aria-orientation]': 'state()',
    '[attr.data-orientation]': 'state()',
  },
})
export class Orientation {
  readonly #element = injectElement();
  readonly _input = input<OrientationState>(null, {alias: 'orientation'});
  readonly state = statePipeline(this._input, {
    finalize: (state) => {
      const role = this.#element.getAttribute('role');

      const validOrientation = Orientation.VALUE_SET.has(state as never);
      const validRole = Orientation.ALLOWED_ROLES_SET.has(role as never);

      if (validOrientation && !validRole && isDevMode()) {
        // eslint-disable-next-line no-console
        console.warn(
          `Orientation: '${state}' is not allowed for role attribute: '${role}'\n` +
            `Allowed roles: ${Orientation.ALLOWED_ROLES_STRING}`,
        );
      }

      return validOrientation && validRole ? state : null;
    },
  });

  /** The set of valid `aria-orientation` attribute values. */
  static readonly VALUE_SET = new Set(['vertical', 'horizontal'] as const);

  /**
   * ARIA roles for which `aria-orientation` is a supported attribute. The
   * directive only reflects `aria-orientation` onto the host when the host
   * carries one of these roles; setting the attribute on a plain `<div>`
   * with no role is an axe `aria-allowed-attr` violation because the
   * attribute has no meaning there. Roving focus is a *behavior*, not a
   * widget role — the role comes from the consumer (toolbar, tablist, ...).
   */
  static readonly ALLOWED_ROLES_SET = new Set([
    'listbox',
    'menu',
    'menubar',
    'radiogroup',
    'scrollbar',
    'select',
    'separator',
    'slider',
    'tablist',
    'toolbar',
    'tree',
  ] as const);

  static readonly ALLOWED_ROLES_STRING = Array.from(Orientation.ALLOWED_ROLES_SET).join(', ');
}
