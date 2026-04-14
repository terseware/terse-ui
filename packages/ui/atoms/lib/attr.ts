import {booleanAttribute, Directive, signal} from '@angular/core';
import {
  hasDisabledAttribute,
  hasRequiredAttribute,
  hostAttr,
  injectElement,
} from '@terseware/ui/internal';
import {IdListState, State} from '@terseware/ui/state';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Narrow a raw attribute string to one of the allowed `tokens`, or `null`
 * otherwise. Used by every token-valued ARIA atom so that callers reading
 * the signal get back a strict union type and invalid strings contributed
 * via `pipe` / `override` are silently dropped.
 */
function narrowToken<const T extends string>(tokens: readonly T[]): (v: string | null) => T | null {
  const set: ReadonlySet<string> = new Set(tokens);
  return (v) => (v != null && set.has(v) ? (v as T) : null);
}

/** Parse a raw attribute string into a finite number, or `null`. */
function attrToNum(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Value unions — exported so consumers can spell the types out.
// ---------------------------------------------------------------------------

/** `"true" | "false"` — ARIA boolean tokens rendered on the DOM. */
export type AriaBool = 'true' | 'false';

/** `"true" | "false" | "mixed"` — ARIA tri-state tokens. */
export type AriaTriState = 'true' | 'false' | 'mixed';

const ariaBoolTokens = ['true', 'false'] as const;
const ariaTriStateTokens = ['true', 'false', 'mixed'] as const;

const ariaHasPopupTokens = ['false', 'true', 'menu', 'listbox', 'tree', 'grid', 'dialog'] as const;
export type AriaHasPopupValue = (typeof ariaHasPopupTokens)[number];

const ariaCurrentTokens = ['page', 'step', 'location', 'date', 'time', 'true', 'false'] as const;
export type AriaCurrentValue = (typeof ariaCurrentTokens)[number];

const ariaInvalidTokens = ['false', 'true', 'grammar', 'spelling'] as const;
export type AriaInvalidValue = (typeof ariaInvalidTokens)[number];

const ariaLiveTokens = ['off', 'polite', 'assertive'] as const;
export type AriaLiveValue = (typeof ariaLiveTokens)[number];

const ariaAutoCompleteTokens = ['inline', 'list', 'both', 'none'] as const;
export type AriaAutoCompleteValue = (typeof ariaAutoCompleteTokens)[number];

const ariaSortTokens = ['ascending', 'descending', 'none', 'other'] as const;
export type AriaSortValue = (typeof ariaSortTokens)[number];

const ariaOrientationTokens = ['horizontal', 'vertical'] as const;
export type AriaOrientationValue = (typeof ariaOrientationTokens)[number];

// ---------------------------------------------------------------------------
// Native boolean host attributes
// Presence-only: rendered as `""` when truthy, removed otherwise.
// ---------------------------------------------------------------------------

@Directive({
  exportAs: 'disabled',
  host: {
    '[attr.disabled]': 'value() ? "" : null',
  },
})
export class Disabled extends State<boolean> {
  constructor() {
    const native = hasDisabledAttribute(injectElement());
    super(signal(booleanAttribute(hostAttr('disabled'))), (v) => (native ? v : false));
  }
}

@Directive({
  exportAs: 'required',
  host: {
    '[attr.required]': 'value() ? "" : null',
  },
})
export class Required extends State<boolean> {
  constructor() {
    const native = hasRequiredAttribute(injectElement());
    super(signal(booleanAttribute(hostAttr('required'))), (v) => (native ? v : false));
  }
}

@Directive({
  exportAs: 'readonly',
  host: {
    '[attr.readonly]': 'value() ? "" : null',
  },
})
export class ReadOnly extends State<boolean> {
  constructor() {
    super(signal(booleanAttribute(hostAttr('readonly'))));
  }
}

@Directive({
  exportAs: 'hidden',
  host: {
    '[attr.hidden]': 'value() ? "" : null',
  },
})
export class Hidden extends State<boolean> {
  constructor() {
    super(signal(booleanAttribute(hostAttr('hidden'))));
  }
}

// ---------------------------------------------------------------------------
// ARIA boolean attributes (`"true" | "false"`)
// ---------------------------------------------------------------------------

@Directive({
  exportAs: 'ariaDisabled',
  host: {
    '[attr.aria-disabled]': 'value()',
  },
})
export class AriaDisabled extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-disabled')), narrowToken(ariaBoolTokens));
  }
}

@Directive({
  exportAs: 'ariaBusy',
  host: {
    '[attr.aria-busy]': 'value()',
  },
})
export class AriaBusy extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-busy')), narrowToken(ariaBoolTokens));
  }
}

@Directive({
  exportAs: 'ariaModal',
  host: {
    '[attr.aria-modal]': 'value()',
  },
})
export class AriaModal extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-modal')), narrowToken(ariaBoolTokens));
  }
}

@Directive({
  exportAs: 'ariaAtomic',
  host: {
    '[attr.aria-atomic]': 'value()',
  },
})
export class AriaAtomic extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-atomic')), narrowToken(ariaBoolTokens));
  }
}

@Directive({
  exportAs: 'ariaReadOnly',
  host: {
    '[attr.aria-readonly]': 'value()',
  },
})
export class AriaReadOnly extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-readonly')), narrowToken(ariaBoolTokens));
  }
}

@Directive({
  exportAs: 'ariaRequired',
  host: {
    '[attr.aria-required]': 'value()',
  },
})
export class AriaRequired extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-required')), narrowToken(ariaBoolTokens));
  }
}

@Directive({
  exportAs: 'ariaMultiLine',
  host: {
    '[attr.aria-multiline]': 'value()',
  },
})
export class AriaMultiLine extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-multiline')), narrowToken(ariaBoolTokens));
  }
}

@Directive({
  exportAs: 'ariaMultiSelectable',
  host: {
    '[attr.aria-multiselectable]': 'value()',
  },
})
export class AriaMultiSelectable extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-multiselectable')), narrowToken(ariaBoolTokens));
  }
}

@Directive({
  exportAs: 'ariaHidden',
  host: {
    '[attr.aria-hidden]': 'value()',
  },
})
export class AriaHidden extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-hidden')), narrowToken(ariaBoolTokens));
  }
}

@Directive({
  exportAs: 'ariaExpanded',
  host: {
    '[attr.aria-expanded]': 'value()',
  },
})
export class AriaExpanded extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-expanded')), narrowToken(ariaBoolTokens));
  }
}

@Directive({
  exportAs: 'ariaSelected',
  host: {
    '[attr.aria-selected]': 'value()',
  },
})
export class AriaSelected extends State<string | null, AriaBool | null> {
  constructor() {
    super(signal(hostAttr('aria-selected')), narrowToken(ariaBoolTokens));
  }
}

// ---------------------------------------------------------------------------
// ARIA tri-state attributes (`"true" | "false" | "mixed"`)
// ---------------------------------------------------------------------------

@Directive({
  exportAs: 'ariaChecked',
  host: {
    '[attr.aria-checked]': 'value()',
  },
})
export class AriaChecked extends State<string | null, AriaTriState | null> {
  constructor() {
    super(signal(hostAttr('aria-checked')), narrowToken(ariaTriStateTokens));
  }
}

@Directive({
  exportAs: 'ariaPressed',
  host: {
    '[attr.aria-pressed]': 'value()',
  },
})
export class AriaPressed extends State<string | null, AriaTriState | null> {
  constructor() {
    super(signal(hostAttr('aria-pressed')), narrowToken(ariaTriStateTokens));
  }
}

// ---------------------------------------------------------------------------
// ARIA token-set attributes (custom unions)
// ---------------------------------------------------------------------------

@Directive({
  exportAs: 'ariaHasPopup',
  host: {
    '[attr.aria-haspopup]': 'value()',
  },
})
export class AriaHasPopup extends State<string | null, AriaHasPopupValue | null> {
  constructor() {
    super(signal(hostAttr('aria-haspopup')), narrowToken(ariaHasPopupTokens));
  }
}

@Directive({
  exportAs: 'ariaCurrent',
  host: {
    '[attr.aria-current]': 'value()',
  },
})
export class AriaCurrent extends State<string | null, AriaCurrentValue | null> {
  constructor() {
    super(signal(hostAttr('aria-current')), narrowToken(ariaCurrentTokens));
  }
}

@Directive({
  exportAs: 'ariaInvalid',
  host: {
    '[attr.aria-invalid]': 'value()',
  },
})
export class AriaInvalid extends State<string | null, AriaInvalidValue | null> {
  constructor() {
    super(signal(hostAttr('aria-invalid')), narrowToken(ariaInvalidTokens));
  }
}

@Directive({
  exportAs: 'ariaLive',
  host: {
    '[attr.aria-live]': 'value()',
  },
})
export class AriaLive extends State<string | null, AriaLiveValue | null> {
  constructor() {
    super(signal(hostAttr('aria-live')), narrowToken(ariaLiveTokens));
  }
}

@Directive({
  exportAs: 'ariaAutoComplete',
  host: {
    '[attr.aria-autocomplete]': 'value()',
  },
})
export class AriaAutoComplete extends State<string | null, AriaAutoCompleteValue | null> {
  constructor() {
    super(signal(hostAttr('aria-autocomplete')), narrowToken(ariaAutoCompleteTokens));
  }
}

@Directive({
  exportAs: 'ariaSort',
  host: {
    '[attr.aria-sort]': 'value()',
  },
})
export class AriaSort extends State<string | null, AriaSortValue | null> {
  constructor() {
    super(signal(hostAttr('aria-sort')), narrowToken(ariaSortTokens));
  }
}

@Directive({
  exportAs: 'ariaOrientation',
  host: {
    '[attr.aria-orientation]': 'value()',
  },
})
export class AriaOrientation extends State<string | null, AriaOrientationValue | null> {
  constructor() {
    super(signal(hostAttr('aria-orientation')), narrowToken(ariaOrientationTokens));
  }
}

// ---------------------------------------------------------------------------
// ARIA numeric attributes
// ---------------------------------------------------------------------------

@Directive({
  exportAs: 'ariaLevel',
  host: {
    '[attr.aria-level]': 'value()',
  },
})
export class AriaLevel extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-level'))));
  }
}

@Directive({
  exportAs: 'ariaPosInSet',
  host: {
    '[attr.aria-posinset]': 'value()',
  },
})
export class AriaPosInSet extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-posinset'))));
  }
}

@Directive({
  exportAs: 'ariaSetSize',
  host: {
    '[attr.aria-setsize]': 'value()',
  },
})
export class AriaSetSize extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-setsize'))));
  }
}

@Directive({
  exportAs: 'ariaValueMin',
  host: {
    '[attr.aria-valuemin]': 'value()',
  },
})
export class AriaValueMin extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-valuemin'))));
  }
}

@Directive({
  exportAs: 'ariaValueMax',
  host: {
    '[attr.aria-valuemax]': 'value()',
  },
})
export class AriaValueMax extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-valuemax'))));
  }
}

@Directive({
  exportAs: 'ariaValueNow',
  host: {
    '[attr.aria-valuenow]': 'value()',
  },
})
export class AriaValueNow extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-valuenow'))));
  }
}

@Directive({
  exportAs: 'ariaColCount',
  host: {
    '[attr.aria-colcount]': 'value()',
  },
})
export class AriaColCount extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-colcount'))));
  }
}

@Directive({
  exportAs: 'ariaColIndex',
  host: {
    '[attr.aria-colindex]': 'value()',
  },
})
export class AriaColIndex extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-colindex'))));
  }
}

@Directive({
  exportAs: 'ariaColSpan',
  host: {
    '[attr.aria-colspan]': 'value()',
  },
})
export class AriaColSpan extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-colspan'))));
  }
}

@Directive({
  exportAs: 'ariaRowCount',
  host: {
    '[attr.aria-rowcount]': 'value()',
  },
})
export class AriaRowCount extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-rowcount'))));
  }
}

@Directive({
  exportAs: 'ariaRowIndex',
  host: {
    '[attr.aria-rowindex]': 'value()',
  },
})
export class AriaRowIndex extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-rowindex'))));
  }
}

@Directive({
  exportAs: 'ariaRowSpan',
  host: {
    '[attr.aria-rowspan]': 'value()',
  },
})
export class AriaRowSpan extends State<number | null> {
  constructor() {
    super(signal(attrToNum(hostAttr('aria-rowspan'))));
  }
}

// ---------------------------------------------------------------------------
// ARIA free-string attributes
// ---------------------------------------------------------------------------

@Directive({
  exportAs: 'ariaLabel',
  host: {
    '[attr.aria-label]': 'value()',
  },
})
export class AriaLabel extends State<string | null> {
  constructor() {
    super(signal(hostAttr('aria-label')));
  }
}

@Directive({
  exportAs: 'ariaKeyShortcuts',
  host: {
    '[attr.aria-keyshortcuts]': 'value()',
  },
})
export class AriaKeyShortcuts extends State<string | null> {
  constructor() {
    super(signal(hostAttr('aria-keyshortcuts')));
  }
}

@Directive({
  exportAs: 'ariaPlaceholder',
  host: {
    '[attr.aria-placeholder]': 'value()',
  },
})
export class AriaPlaceholder extends State<string | null> {
  constructor() {
    super(signal(hostAttr('aria-placeholder')));
  }
}

@Directive({
  exportAs: 'ariaValueText',
  host: {
    '[attr.aria-valuetext]': 'value()',
  },
})
export class AriaValueText extends State<string | null> {
  constructor() {
    super(signal(hostAttr('aria-valuetext')));
  }
}

@Directive({
  exportAs: 'ariaRoleDescription',
  host: {
    '[attr.aria-roledescription]': 'value()',
  },
})
export class AriaRoleDescription extends State<string | null> {
  constructor() {
    super(signal(hostAttr('aria-roledescription')));
  }
}

@Directive({
  exportAs: 'ariaActiveDescendant',
  host: {
    '[attr.aria-activedescendant]': 'value()',
  },
})
export class AriaActiveDescendant extends State<string | null> {
  constructor() {
    super(signal(hostAttr('aria-activedescendant')));
  }
}

// ---------------------------------------------------------------------------
// ARIA IDREF(S) attributes — space-separated lists of id refs.
// ---------------------------------------------------------------------------

@Directive({
  exportAs: 'ariaControls',
  host: {
    '[attr.aria-controls]': 'value()',
  },
})
export class AriaControls extends IdListState {
  constructor() {
    super(signal(hostAttr('aria-controls')));
  }
}

@Directive({
  exportAs: 'ariaDescribedBy',
  host: {
    '[attr.aria-describedby]': 'value()',
  },
})
export class AriaDescribedBy extends IdListState {
  constructor() {
    super(signal(hostAttr('aria-describedby')));
  }
}

@Directive({
  exportAs: 'ariaDetails',
  host: {
    '[attr.aria-details]': 'value()',
  },
})
export class AriaDetails extends IdListState {
  constructor() {
    super(signal(hostAttr('aria-details')));
  }
}

@Directive({
  exportAs: 'ariaFlowTo',
  host: {
    '[attr.aria-flowto]': 'value()',
  },
})
export class AriaFlowTo extends IdListState {
  constructor() {
    super(signal(hostAttr('aria-flowto')));
  }
}

@Directive({
  exportAs: 'ariaLabelledBy',
  host: {
    '[attr.aria-labelledby]': 'value()',
  },
})
export class AriaLabelledBy extends IdListState {
  constructor() {
    super(signal(hostAttr('aria-labelledby')));
  }
}

@Directive({
  exportAs: 'ariaOwns',
  host: {
    '[attr.aria-owns]': 'value()',
  },
})
export class AriaOwns extends IdListState {
  constructor() {
    super(signal(hostAttr('aria-owns')));
  }
}

@Directive({
  exportAs: 'ariaErrorMessage',
  host: {
    '[attr.aria-errormessage]': 'value()',
  },
})
export class AriaErrorMessage extends IdListState {
  constructor() {
    super(signal(hostAttr('aria-errormessage')));
  }
}

// ---------------------------------------------------------------------------
// `data-*` state attributes.
// All store `string | null` so contributors can either use them as presence
// markers (`"" | null`) or carry a short descriptive value (e.g. the
// `data-disabled="soft" | "hard"` variant used by `Disabler`).
// ---------------------------------------------------------------------------

@Directive({
  exportAs: 'dataChecked',
  host: {
    '[attr.data-checked]': 'value()',
  },
})
export class DataChecked extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-checked')));
  }
}

@Directive({
  exportAs: 'dataUnchecked',
  host: {
    '[attr.data-unchecked]': 'value()',
  },
})
export class DataUnchecked extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-unchecked')));
  }
}

@Directive({
  exportAs: 'dataDisabled',
  host: {
    '[attr.data-disabled]': 'value()',
  },
})
export class DataDisabled extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-disabled')));
  }
}

@Directive({
  exportAs: 'dataHighlighted',
  host: {
    '[attr.data-highlighted]': 'value()',
  },
})
export class DataHighlighted extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-highlighted')));
  }
}

@Directive({
  exportAs: 'dataOpened',
  host: {
    '[attr.data-opened]': 'value()',
  },
})
export class DataOpened extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-opened')));
  }
}

@Directive({
  exportAs: 'dataClosed',
  host: {
    '[attr.data-closed]': 'value()',
  },
})
export class DataClosed extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-closed')));
  }
}

@Directive({
  exportAs: 'dataSelected',
  host: {
    '[attr.data-selected]': 'value()',
  },
})
export class DataSelected extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-selected')));
  }
}

@Directive({
  exportAs: 'dataPressed',
  host: {
    '[attr.data-pressed]': 'value()',
  },
})
export class DataPressed extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-pressed')));
  }
}

@Directive({
  exportAs: 'dataRequired',
  host: {
    '[attr.data-required]': 'value()',
  },
})
export class DataRequired extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-required')));
  }
}

@Directive({
  exportAs: 'dataInvalid',
  host: {
    '[attr.data-invalid]': 'value()',
  },
})
export class DataInvalid extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-invalid')));
  }
}

@Directive({
  exportAs: 'dataReadOnly',
  host: {
    '[attr.data-readonly]': 'value()',
  },
})
export class DataReadOnly extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-readonly')));
  }
}

@Directive({
  exportAs: 'dataActive',
  host: {
    '[attr.data-active]': 'value()',
  },
})
export class DataActive extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-active')));
  }
}

@Directive({
  exportAs: 'dataFocus',
  host: {
    '[attr.data-focus]': 'value()',
  },
})
export class DataFocus extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-focus')));
  }
}

@Directive({
  exportAs: 'dataFocusVisible',
  host: {
    '[attr.data-focus-visible]': 'value()',
  },
})
export class DataFocusVisible extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-focus-visible')));
  }
}

@Directive({
  exportAs: 'dataHover',
  host: {
    '[attr.data-hover]': 'value()',
  },
})
export class DataHover extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-hover')));
  }
}

@Directive({
  exportAs: 'dataEmpty',
  host: {
    '[attr.data-empty]': 'value()',
  },
})
export class DataEmpty extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-empty')));
  }
}

@Directive({
  exportAs: 'dataOrientation',
  host: {
    '[attr.data-orientation]': 'value()',
  },
})
export class DataOrientation extends State<string | null> {
  constructor() {
    super(signal(hostAttr('data-orientation')));
  }
}
