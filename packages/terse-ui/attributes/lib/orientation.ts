import {Directive, inject, input, isDevMode} from '@angular/core';
import {AttributePipeline} from './attribute';
import {RoleAttribute} from './role-attribute';

export type OrientationValue = 'vertical' | 'horizontal' | null;

@Directive({
  exportAs: 'orientation',
  hostDirectives: [RoleAttribute],
  host: {
    '[attr.aria-orientation]': 'state.domValue()',
    '[attr.data-orientation]': 'state.domValue()',
  },
})
export class Orientation extends AttributePipeline<OrientationValue> {
  readonly #role = inject(RoleAttribute);
  readonly orientation = input<OrientationValue>(null);
  constructor() {
    super(null, (value) => {
      const validOrientation = Orientation.VALUE_SET.has(value as never);
      const validRole = Orientation.ALLOWED_ROLES_SET.has(this.#role.state.domValue() as never);

      if (validOrientation && !validRole && isDevMode()) {
        // eslint-disable-next-line no-console
        console.warn(
          `Orientation ${value} is not allowed for role ${this.#role.state.domValue()}` +
            ` Allowed roles: ${Orientation.ALLOWED_ROLES_STRING}`,
        );
      }

      return validOrientation && validRole ? value : null;
    });
  }

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
