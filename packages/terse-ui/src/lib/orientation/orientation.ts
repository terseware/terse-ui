import {computed, Directive, inject, input, isDevMode, type InputSignal} from '@angular/core';
import {injectElement, statePipeline} from '@terse-ui/utils';
import {Base} from '../base/base';

export type OrientationState = 'vertical' | 'horizontal';

const ALLOWED_ROLES_SET = new Set([
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

const ALLOWED_ROLES_STRING = Array.from(ALLOWED_ROLES_SET).join(', ');

@Directive({
  hostDirectives: [Base],
  host: {
    '[attr.aria-orientation]': 'orientationAttr()',
    '[attr.data-orientation]': 'orientationAttr()',
  },
})
export class Orientation {
  readonly base = inject(Base);
  readonly #element = injectElement();

  readonly #parent = inject(Orientation, {optional: true, skipSelf: true});
  readonly #initOrientation: OrientationState = this.#parent?.orientation() ?? 'vertical';
  readonly orientationInput: InputSignal<OrientationState> = input(this.#initOrientation, {
    alias: 'orientation',
  });

  readonly orientation = statePipeline<OrientationState>(this.orientationInput);
  protected readonly orientationAttr = computed(() => {
    const state = this.orientation();
    const role = this.base.role() ?? this.#element.getAttribute('role');
    if (ALLOWED_ROLES_SET.has(role as never)) {
      return state;
    }

    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.warn(
        `Orientation: '${state}' is not allowed for role attribute: '${role}'\n` +
          `Allowed roles: ${ALLOWED_ROLES_STRING}\n` +
          `Setting orientation to 'null'`,
      );
    }

    return null;
  });
}
