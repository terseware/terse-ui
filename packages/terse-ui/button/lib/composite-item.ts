import {Directive, inject} from '@angular/core';
import {Disabler} from '@terse-ui/core/disabler';
import {OnKeyDown, OnKeyUp} from '@terse-ui/core/events';
import {injectElement, isTextNavigationRole} from '@terse-ui/core/utils';
import {Button} from './button';

/**
 * Composite-widget button item. Extends {@link Button} so activation happens
 * on Space keydown (instead of keyup), which is required for roving focus,
 * typeahead, and other composite patterns where the outer widget needs to
 * see the activation before focus moves.
 *
 * Compose this into menu items, listbox options, toolbar buttons, grid cells
 * — any role that lives inside a composite widget.
 *
 * Behavior layered on top of Button:
 * - **Space keydown** → `preventDefault`, `.click()`, halt the pipeline.
 * - **Space keyup** → `preventDefault`, halt (prevents Button/native from
 *   firing a second click on keyup).
 * - **Text-navigation roles** (`menuitem*`, `option`, `gridcell`): if Space
 *   was already `defaultPrevented` when keydown fires (parent typeahead
 *   consumed it), halt without activating.
 * - **Disabled items** delegate to Disabler (hard: halt; soft: preventDefault).
 */
@Directive({
  hostDirectives: [Button],
})
export class CompositeItem {
  readonly #element = injectElement();
  readonly #disabler = inject(Disabler);

  constructor() {
    inject(OnKeyDown).pipe(
      ({event, next, haltPipeline, preventDefault}) => {
        if (event.key !== ' ' || event.target !== event.currentTarget) {
          return next();
        }

        // Disabled items: defer to Disabler's halt/suppress policy.
        if (this.#disabler.disabled()) return next();

        const role = (event.currentTarget as HTMLElement).getAttribute('role');
        if (event.defaultPrevented && isTextNavigationRole(role)) {
          haltPipeline();
          return;
        }

        preventDefault();
        this.#element.click();
        haltPipeline();
      },
      {prepend: true},
    );

    inject(OnKeyUp).pipe(
      ({event, next, haltPipeline, preventDefault}) => {
        if (event.key !== ' ' || event.target !== event.currentTarget) {
          return next();
        }

        if (this.#disabler.disabled()) return next();

        // Activation already happened on keydown; suppress the keyup so
        // native <button> doesn't double-fire a click.
        preventDefault();
        haltPipeline();
      },
      {prepend: true},
    );
  }
}
