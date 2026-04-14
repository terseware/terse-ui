import {Directive, HostAttributeToken, inject, input, linkedSignal} from '@angular/core';
import {hasDisabledAttribute, injectElement} from '@terse-ui/core/utils';
import {AttributePipeline} from './attribute';

@Directive({
  exportAs: 'disabled',
  host: {'[attr.disabled]': 'state.domValue()'},
})
export class DisabledAttribute extends AttributePipeline<boolean> {
  readonly #native = hasDisabledAttribute(injectElement());
  constructor() {
    super(false, (value) => (this.#native && value ? '' : null));
  }
}

@Directive({
  exportAs: 'role',
  host: {'[attr.role]': 'state.domValue()'},
})
export class RoleAttribute extends AttributePipeline<string | null> {
  readonly #host = inject(new HostAttributeToken('role'), {optional: true});
  readonly role = input(this.#host);
  constructor() {
    super(
      linkedSignal(() => this.role()),
      (value) => value,
    );
  }
}

@Directive({
  exportAs: 'type',
  host: {'[attr.type]': 'state.domValue()'},
})
export class TypeAttribute extends AttributePipeline<string | null> {
  readonly #host = inject(new HostAttributeToken('type'), {optional: true});
  readonly type = input(this.#host);
  constructor() {
    super(
      linkedSignal(() => this.type()),
      (value) => value,
    );
  }
}

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
    super(null, (value) =>
      Orientation.VALUE_SET.has(value as never) &&
      Orientation.ALLOWED_ROLES_SET.has(this.#role.state.domValue() as never)
        ? value
        : null,
    );
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
}
