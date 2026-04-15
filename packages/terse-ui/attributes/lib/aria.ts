import {computed, Directive} from '@angular/core';
import {isBoolean, statePipeline} from '@terse-ui/core/utils';

@Directive({host: {'[aria-disabled]': 'value()'}})
export class AriaDisabled {
  readonly value = statePipeline<'true' | 'false' | boolean | null>(null, {
    finalize: (v) => (isBoolean(v) ? (v ? 'true' : 'false') : v),
  });
}

@Directive({host: {'[aria-expanded]': 'value()'}})
export class AriaExpanded {
  readonly value = statePipeline<'true' | 'false' | boolean | null>(null, {
    finalize: (v) => (isBoolean(v) ? (v ? 'true' : 'false') : v),
  });
}
const ariaHasPopupTokens = ['false', 'true', 'menu', 'listbox', 'tree', 'grid', 'dialog'] as const;
const ariaHasPopupSet = new Set(ariaHasPopupTokens);
export type AriaHasPopupValue = (typeof ariaHasPopupTokens)[number];

@Directive({host: {'[aria-haspopup]': 'value()'}})
export class AriaHasPopup {
  readonly value = statePipeline<AriaHasPopupValue | null>(null, {
    finalize: (v) => (ariaHasPopupSet.has(v as never) ? v : null),
  });
}

@Directive({host: {'[aria-controls]': 'domVal()'}})
export class AriaControls {
  readonly value = statePipeline<string[]>([]);
  protected readonly domVal = computed(
    () =>
      this.value()
        .map((id) => id.trim())
        .filter(Boolean)
        .join(' ') || null,
  );
}
