import {Directive, inject, input, isDevMode} from '@angular/core';
import {pipelineSignal} from '@terse-ui/core/state';
import {RoleAttribute} from './role-attribute';

export type OrientationValue = 'vertical' | 'horizontal' | null;

@Directive({
  hostDirectives: [RoleAttribute],
  host: {
    '[attr.aria-orientation]': 'value()',
    '[attr.data-orientation]': 'value()',
  },
})
export class Orientation {
  readonly #role = inject(RoleAttribute);
  readonly _input = input<OrientationValue>(null, {alias: 'orientation'});
  readonly value = pipelineSignal(this._input, {
    normalize: (value) => {
      const validOrientation = Orientation.VALUE_SET.has(value as never);
      const validRole = Orientation.ALLOWED_ROLES_SET.has(this.#role.value() as never);

      if (validOrientation && !validRole && isDevMode()) {
        // eslint-disable-next-line no-console
        console.warn(
          `Orientation ${value} is not allowed for role ${this.#role.value()}` +
            ` Allowed roles: ${Orientation.ALLOWED_ROLES_STRING}`,
        );
      }

      return validOrientation && validRole ? value : null;
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
