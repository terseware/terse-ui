import {Directive} from '@angular/core';
import {render, screen} from '@testing-library/angular';
import {expectNoA11yViolations} from '../../test-axe';
import {
  AriaActiveDescendant,
  AriaAtomic,
  AriaAutoComplete,
  AriaBusy,
  AriaChecked,
  AriaColCount,
  AriaColIndex,
  AriaColSpan,
  AriaControls,
  AriaCurrent,
  AriaDescribedBy,
  AriaDetails,
  AriaDisabled,
  AriaErrorMessage,
  AriaExpanded,
  AriaFlowTo,
  AriaHasPopup,
  AriaHidden,
  AriaInvalid,
  AriaKeyShortcuts,
  AriaLabel,
  AriaLabelledBy,
  AriaLevel,
  AriaLive,
  AriaModal,
  AriaMultiLine,
  AriaMultiSelectable,
  AriaOrientation,
  AriaOwns,
  AriaPlaceholder,
  AriaPosInSet,
  AriaPressed,
  AriaReadOnly,
  AriaRequired,
  AriaRoleDescription,
  AriaRowCount,
  AriaRowIndex,
  AriaRowSpan,
  AriaSelected,
  AriaSetSize,
  AriaSort,
  AriaValueMax,
  AriaValueMin,
  AriaValueNow,
  AriaValueText,
  DataActive,
  DataChecked,
  DataClosed,
  DataDisabled,
  DataEmpty,
  DataFocus,
  DataFocusVisible,
  DataHighlighted,
  DataHover,
  DataInvalid,
  DataOpened,
  DataOrientation,
  DataPressed,
  DataReadOnly,
  DataRequired,
  DataSelected,
  DataUnchecked,
  Disabled,
  Hidden,
  ReadOnly,
  Required,
} from './attr';

// ---------------------------------------------------------------------------
// Test harness directives — one per category that composes every attr atom
// in that category via `hostDirectives`. Tests use a single selector per
// harness so they don't have to repeat `imports: [...]` lists.
// ---------------------------------------------------------------------------

@Directive({
  selector: '[nativeBool]',
  hostDirectives: [Disabled, Required, ReadOnly, Hidden],
})
class NativeBoolHarness {}

@Directive({
  selector: '[ariaBool]',
  hostDirectives: [
    AriaDisabled,
    AriaBusy,
    AriaModal,
    AriaAtomic,
    AriaReadOnly,
    AriaRequired,
    AriaMultiLine,
    AriaMultiSelectable,
    AriaHidden,
    AriaExpanded,
    AriaSelected,
  ],
})
class AriaBoolHarness {}

@Directive({
  selector: '[ariaTri]',
  hostDirectives: [AriaChecked, AriaPressed],
})
class AriaTriHarness {}

@Directive({
  selector: '[ariaToken]',
  hostDirectives: [
    AriaHasPopup,
    AriaCurrent,
    AriaInvalid,
    AriaLive,
    AriaAutoComplete,
    AriaSort,
    AriaOrientation,
  ],
})
class AriaTokenHarness {}

@Directive({
  selector: '[ariaNum]',
  hostDirectives: [
    AriaLevel,
    AriaPosInSet,
    AriaSetSize,
    AriaValueMin,
    AriaValueMax,
    AriaValueNow,
    AriaColCount,
    AriaColIndex,
    AriaColSpan,
    AriaRowCount,
    AriaRowIndex,
    AriaRowSpan,
  ],
})
class AriaNumHarness {}

@Directive({
  selector: '[ariaStr]',
  hostDirectives: [
    AriaLabel,
    AriaKeyShortcuts,
    AriaPlaceholder,
    AriaValueText,
    AriaRoleDescription,
    AriaActiveDescendant,
  ],
})
class AriaStrHarness {}

@Directive({
  selector: '[ariaIdRef]',
  hostDirectives: [
    AriaControls,
    AriaDescribedBy,
    AriaDetails,
    AriaFlowTo,
    AriaLabelledBy,
    AriaOwns,
    AriaErrorMessage,
  ],
})
class AriaIdRefHarness {}

@Directive({
  selector: '[dataState]',
  hostDirectives: [
    DataChecked,
    DataUnchecked,
    DataDisabled,
    DataHighlighted,
    DataOpened,
    DataClosed,
    DataSelected,
    DataPressed,
    DataRequired,
    DataInvalid,
    DataReadOnly,
    DataActive,
    DataFocus,
    DataFocusVisible,
    DataHover,
    DataEmpty,
    DataOrientation,
  ],
})
class DataStateHarness {}

describe('attr atoms', () => {
  // -------------------------------------------------------------------------
  // Native boolean attributes — presence-only rendering
  // -------------------------------------------------------------------------

  describe('native boolean host attributes', () => {
    it('renders disabled attribute on native <button> when present at host', async () => {
      await render(`<button nativeBool disabled></button>`, {imports: [NativeBoolHarness]});
      expect(screen.getByRole('button')).toHaveAttribute('disabled', '');
    });

    it('does not render disabled attribute on elements without native disabled support', async () => {
      // `Disabled` reads `hasDisabledAttribute(element)` and forces false for
      // non-native hosts, so the attribute must not appear on a <span>.
      await render(`<span nativeBool role="button" disabled>x</span>`, {
        imports: [NativeBoolHarness],
      });
      expect(screen.getByRole('button')).not.toHaveAttribute('disabled');
    });

    it('renders required attribute on <input>', async () => {
      await render(`<input nativeBool required aria-label="name" />`, {
        imports: [NativeBoolHarness],
      });
      expect(screen.getByRole('textbox', {name: 'name'})).toHaveAttribute('required', '');
    });

    it('renders readonly attribute when initial', async () => {
      await render(`<input nativeBool readonly aria-label="name" />`, {
        imports: [NativeBoolHarness],
      });
      expect(screen.getByRole('textbox', {name: 'name'})).toHaveAttribute('readonly', '');
    });

    it('renders hidden attribute when initial', async () => {
      const {container} = await render(`<div nativeBool hidden data-testid="h">x</div>`, {
        imports: [NativeBoolHarness],
      });
      expect(container.querySelector('[data-testid="h"]')).toHaveAttribute('hidden', '');
    });

    it('removes native boolean attributes when initial value is absent', async () => {
      await render(`<button nativeBool></button>`, {imports: [NativeBoolHarness]});
      const btn = screen.getByRole('button');
      expect(btn).not.toHaveAttribute('disabled');
      expect(btn).not.toHaveAttribute('required');
      expect(btn).not.toHaveAttribute('readonly');
      expect(btn).not.toHaveAttribute('hidden');
    });
  });

  // -------------------------------------------------------------------------
  // ARIA boolean attributes (`"true" | "false"`)
  // -------------------------------------------------------------------------

  describe('aria boolean attributes', () => {
    // `aria-hidden` removes the element from the AT tree, so role-based
    // queries can't reach it — that atom is exercised via a direct DOM
    // lookup below rather than via `getByRole`.
    const roleQueryable: string[] = [
      'aria-disabled',
      'aria-busy',
      'aria-modal',
      'aria-atomic',
      'aria-readonly',
      'aria-required',
      'aria-multiline',
      'aria-multiselectable',
      'aria-expanded',
      'aria-selected',
    ];

    for (const attr of roleQueryable) {
      it(`reflects initial "true" for ${attr}`, async () => {
        await render(`<div ariaBool role="button" ${attr}="true">x</div>`, {
          imports: [AriaBoolHarness],
        });
        expect(screen.getByRole('button')).toHaveAttribute(attr, 'true');
      });

      it(`reflects initial "false" for ${attr}`, async () => {
        await render(`<div ariaBool role="button" ${attr}="false">x</div>`, {
          imports: [AriaBoolHarness],
        });
        expect(screen.getByRole('button')).toHaveAttribute(attr, 'false');
      });

      it(`drops invalid value for ${attr}`, async () => {
        await render(`<div ariaBool role="button" ${attr}="banana">x</div>`, {
          imports: [AriaBoolHarness],
        });
        // narrowToken returns null → attribute is removed
        expect(screen.getByRole('button')).not.toHaveAttribute(attr);
      });

      it(`omits ${attr} when initial absent`, async () => {
        await render(`<div ariaBool role="button">x</div>`, {imports: [AriaBoolHarness]});
        expect(screen.getByRole('button')).not.toHaveAttribute(attr);
      });
    }

    it('reflects aria-hidden="true" (element hidden from AT)', async () => {
      const {container} = await render(`<div ariaBool data-testid="h" aria-hidden="true">x</div>`, {
        imports: [AriaBoolHarness],
      });
      expect(container.querySelector('[data-testid="h"]')).toHaveAttribute('aria-hidden', 'true');
    });

    it('drops invalid aria-hidden value', async () => {
      const {container} = await render(
        `<div ariaBool data-testid="h" aria-hidden="banana">x</div>`,
        {imports: [AriaBoolHarness]},
      );
      expect(container.querySelector('[data-testid="h"]')).not.toHaveAttribute('aria-hidden');
    });
  });

  // -------------------------------------------------------------------------
  // ARIA tri-state attributes (`"true" | "false" | "mixed"`)
  // -------------------------------------------------------------------------

  describe('aria tri-state attributes', () => {
    for (const attr of ['aria-checked', 'aria-pressed']) {
      it(`accepts "mixed" for ${attr}`, async () => {
        await render(`<div ariaTri role="button" ${attr}="mixed">x</div>`, {
          imports: [AriaTriHarness],
        });
        expect(screen.getByRole('button')).toHaveAttribute(attr, 'mixed');
      });

      it(`accepts "true" for ${attr}`, async () => {
        await render(`<div ariaTri role="button" ${attr}="true">x</div>`, {
          imports: [AriaTriHarness],
        });
        expect(screen.getByRole('button')).toHaveAttribute(attr, 'true');
      });

      it(`rejects garbage for ${attr}`, async () => {
        await render(`<div ariaTri role="button" ${attr}="kinda">x</div>`, {
          imports: [AriaTriHarness],
        });
        expect(screen.getByRole('button')).not.toHaveAttribute(attr);
      });
    }
  });

  // -------------------------------------------------------------------------
  // ARIA token-set attributes
  // -------------------------------------------------------------------------

  describe('aria token-set attributes', () => {
    for (const token of ['false', 'true', 'menu', 'listbox', 'tree', 'grid', 'dialog']) {
      it(`AriaHasPopup accepts token "${token}"`, async () => {
        await render(`<button ariaToken aria-haspopup="${token}">x</button>`, {
          imports: [AriaTokenHarness],
        });
        expect(screen.getByRole('button')).toHaveAttribute('aria-haspopup', token);
      });
    }

    it('AriaHasPopup drops unknown token', async () => {
      await render(`<button ariaToken aria-haspopup="random">x</button>`, {
        imports: [AriaTokenHarness],
      });
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-haspopup');
    });

    it('AriaCurrent accepts "page"', async () => {
      await render(`<a ariaToken href="#a" aria-current="page">x</a>`, {
        imports: [AriaTokenHarness],
      });
      expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page');
    });

    it('AriaCurrent drops invalid token', async () => {
      await render(`<a ariaToken href="#a" aria-current="section">x</a>`, {
        imports: [AriaTokenHarness],
      });
      expect(screen.getByRole('link')).not.toHaveAttribute('aria-current');
    });

    it('AriaLive accepts "polite"', async () => {
      await render(`<div ariaToken role="status" aria-live="polite">x</div>`, {
        imports: [AriaTokenHarness],
      });
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('AriaAutoComplete accepts "list"', async () => {
      await render(`<input ariaToken aria-label="q" aria-autocomplete="list" />`, {
        imports: [AriaTokenHarness],
      });
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('AriaSort accepts "ascending" on columnheader', async () => {
      await render(
        `<table>
           <thead><tr><th ariaToken role="columnheader" aria-sort="ascending">Name</th></tr></thead>
           <tbody><tr><td>A</td></tr></tbody>
         </table>`,
        {imports: [AriaTokenHarness]},
      );
      expect(screen.getByRole('columnheader', {name: 'Name'})).toHaveAttribute(
        'aria-sort',
        'ascending',
      );
    });

    it('AriaOrientation accepts "vertical"', async () => {
      await render(
        `<div ariaToken role="toolbar" aria-label="t" aria-orientation="vertical">x</div>`,
        {imports: [AriaTokenHarness]},
      );
      expect(screen.getByRole('toolbar')).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('AriaOrientation drops unknown token', async () => {
      await render(
        `<div ariaToken role="toolbar" aria-label="t" aria-orientation="sideways">x</div>`,
        {imports: [AriaTokenHarness]},
      );
      expect(screen.getByRole('toolbar')).not.toHaveAttribute('aria-orientation');
    });
  });

  // -------------------------------------------------------------------------
  // ARIA numeric attributes
  // -------------------------------------------------------------------------

  describe('aria numeric attributes', () => {
    it('parses aria-level into the attribute', async () => {
      await render(`<h2 ariaNum aria-level="3">Title</h2>`, {imports: [AriaNumHarness]});
      expect(screen.getByRole('heading', {level: 3})).toHaveAttribute('aria-level', '3');
    });

    it('parses aria-valuemin, aria-valuemax, aria-valuenow on a slider', async () => {
      await render(
        `<div ariaNum role="slider" aria-label="vol"
              aria-valuemin="0" aria-valuemax="100" aria-valuenow="42">
         </div>`,
        {imports: [AriaNumHarness]},
      );
      const slider = screen.getByRole('slider', {name: 'vol'});
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
      expect(slider).toHaveAttribute('aria-valuenow', '42');
    });

    it('drops non-numeric values (NaN → null)', async () => {
      await render(`<div ariaNum role="slider" aria-label="v" aria-valuenow="banana"></div>`, {
        imports: [AriaNumHarness],
      });
      expect(screen.getByRole('slider')).not.toHaveAttribute('aria-valuenow');
    });

    it('parses aria-posinset and aria-setsize', async () => {
      await render(`<li ariaNum role="listitem" aria-posinset="2" aria-setsize="5">Item</li>`, {
        imports: [AriaNumHarness],
      });
      const item = screen.getByRole('listitem');
      expect(item).toHaveAttribute('aria-posinset', '2');
      expect(item).toHaveAttribute('aria-setsize', '5');
    });

    it('parses grid numeric attributes', async () => {
      await render(
        `<div ariaNum role="gridcell" aria-colindex="2" aria-colspan="1" aria-rowindex="3" aria-rowspan="1">x</div>`,
        {imports: [AriaNumHarness]},
      );
      const cell = screen.getByRole('gridcell');
      expect(cell).toHaveAttribute('aria-colindex', '2');
      expect(cell).toHaveAttribute('aria-colspan', '1');
      expect(cell).toHaveAttribute('aria-rowindex', '3');
      expect(cell).toHaveAttribute('aria-rowspan', '1');
    });
  });

  // -------------------------------------------------------------------------
  // ARIA free-string attributes
  // -------------------------------------------------------------------------

  describe('aria free-string attributes', () => {
    it('reflects aria-label verbatim', async () => {
      await render(`<button ariaStr aria-label="Close dialog">x</button>`, {
        imports: [AriaStrHarness],
      });
      expect(screen.getByRole('button', {name: 'Close dialog'})).toBeInTheDocument();
    });

    it('reflects aria-roledescription', async () => {
      await render(
        `<div ariaStr role="button" tabindex="0" aria-label="slide"
              aria-roledescription="slide">content</div>`,
        {imports: [AriaStrHarness]},
      );
      expect(screen.getByRole('button', {name: 'slide'})).toHaveAttribute(
        'aria-roledescription',
        'slide',
      );
    });

    it('reflects aria-placeholder', async () => {
      await render(
        `<div ariaStr role="textbox" aria-label="q" contenteditable="true"
              aria-placeholder="search..."></div>`,
        {imports: [AriaStrHarness]},
      );
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-placeholder', 'search...');
    });

    it('reflects aria-valuetext', async () => {
      await render(
        `<div ariaStr role="slider" aria-label="v" aria-valuemin="0" aria-valuemax="3"
              aria-valuenow="1" aria-valuetext="low"></div>`,
        {imports: [AriaStrHarness]},
      );
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'low');
    });

    it('reflects aria-keyshortcuts', async () => {
      await render(`<button ariaStr aria-keyshortcuts="Control+S">Save</button>`, {
        imports: [AriaStrHarness],
      });
      expect(screen.getByRole('button')).toHaveAttribute('aria-keyshortcuts', 'Control+S');
    });

    it('reflects aria-activedescendant', async () => {
      await render(
        `<div ariaStr role="listbox" aria-label="opts"
              aria-activedescendant="opt-1" tabindex="0">
           <div id="opt-1" role="option">A</div>
         </div>`,
        {imports: [AriaStrHarness]},
      );
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-activedescendant', 'opt-1');
    });
  });

  // -------------------------------------------------------------------------
  // ARIA IDREFS — space-separated lists
  // -------------------------------------------------------------------------

  describe('aria idref(s) attributes', () => {
    it('reflects aria-controls as a single id', async () => {
      await render(`<button ariaIdRef aria-controls="panel">x</button><div id="panel">p</div>`, {
        imports: [AriaIdRefHarness],
      });
      expect(screen.getByRole('button')).toHaveAttribute('aria-controls', 'panel');
    });

    it('preserves multiple space-separated ids for aria-controls', async () => {
      await render(
        `<button ariaIdRef aria-controls="a b c">x</button>
         <div id="a"></div><div id="b"></div><div id="c"></div>`,
        {imports: [AriaIdRefHarness]},
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-controls', 'a b c');
    });

    it('collapses extra whitespace in aria-describedby', async () => {
      await render(
        `<button ariaIdRef aria-describedby="  a   b  ">x</button>
         <div id="a">A</div><div id="b">B</div>`,
        {imports: [AriaIdRefHarness]},
      );
      // split(/\s+/).filter(Boolean) → 'a b'
      expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', 'a b');
    });

    it('reflects aria-labelledby', async () => {
      await render(
        `<h2 id="title">Dialog Title</h2>
         <div ariaIdRef role="dialog" aria-labelledby="title">body</div>`,
        {imports: [AriaIdRefHarness]},
      );
      expect(screen.getByRole('dialog', {name: 'Dialog Title'})).toBeInTheDocument();
    });

    it('removes the attribute entirely when no ids supplied', async () => {
      await render(`<button ariaIdRef>x</button>`, {imports: [AriaIdRefHarness]});
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-controls');
    });
  });

  // -------------------------------------------------------------------------
  // `data-*` state attributes
  // -------------------------------------------------------------------------

  describe('data-* state attributes', () => {
    it('reflects data-opened with empty string marker', async () => {
      await render(`<div dataState role="dialog" aria-label="d" data-opened="">x</div>`, {
        imports: [DataStateHarness],
      });
      expect(screen.getByRole('dialog')).toHaveAttribute('data-opened', '');
    });

    it('carries descriptive data-disabled variant', async () => {
      await render(`<button dataState data-disabled="soft">x</button>`, {
        imports: [DataStateHarness],
      });
      expect(screen.getByRole('button')).toHaveAttribute('data-disabled', 'soft');
    });

    it('reflects data-orientation=horizontal', async () => {
      await render(
        `<div dataState role="separator" aria-orientation="horizontal" data-orientation="horizontal"></div>`,
        {imports: [DataStateHarness]},
      );
      expect(screen.getByRole('separator')).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('omits data-* attributes when initial value is absent', async () => {
      await render(`<button dataState>x</button>`, {imports: [DataStateHarness]});
      const btn = screen.getByRole('button');
      expect(btn).not.toHaveAttribute('data-disabled');
      expect(btn).not.toHaveAttribute('data-opened');
      expect(btn).not.toHaveAttribute('data-pressed');
    });
  });

  // -------------------------------------------------------------------------
  // Axe sweep — each category renders cleanly with no a11y violations.
  // -------------------------------------------------------------------------

  describe('axe a11y sweep', () => {
    it('native bool harness: no axe violations', async () => {
      const {container} = await render(`<button nativeBool aria-label="Close">×</button>`, {
        imports: [NativeBoolHarness],
      });
      await expectNoA11yViolations(container);
    });

    it('aria bool harness on expandable button: no axe violations', async () => {
      const {container} = await render(
        `<button ariaBool aria-expanded="false" aria-controls="p">Toggle</button>
         <div id="p" hidden>panel</div>`,
        {imports: [AriaBoolHarness]},
      );
      await expectNoA11yViolations(container);
    });

    it('aria tri-state on toggle button: no axe violations', async () => {
      const {container} = await render(`<button ariaTri aria-pressed="false">Mute</button>`, {
        imports: [AriaTriHarness],
      });
      await expectNoA11yViolations(container);
    });

    it('aria token harness on popup trigger: no axe violations', async () => {
      const {container} = await render(
        `<button ariaToken aria-haspopup="menu" aria-expanded="false">Menu</button>`,
        {imports: [AriaTokenHarness]},
      );
      await expectNoA11yViolations(container);
    });

    it('aria numeric harness on slider: no axe violations', async () => {
      const {container} = await render(
        `<div ariaNum role="slider" aria-label="vol" tabindex="0"
              aria-valuemin="0" aria-valuemax="100" aria-valuenow="42"></div>`,
        {imports: [AriaNumHarness]},
      );
      await expectNoA11yViolations(container);
    });

    it('aria string harness on labeled button: no axe violations', async () => {
      const {container} = await render(`<button ariaStr aria-label="Close">×</button>`, {
        imports: [AriaStrHarness],
      });
      await expectNoA11yViolations(container);
    });

    it('aria idref harness on labelled dialog: no axe violations', async () => {
      const {container} = await render(
        `<h2 id="title">Settings</h2>
         <div ariaIdRef role="dialog" aria-modal="true" aria-labelledby="title">
           <p id="desc">Configure app</p>
           <button aria-describedby="desc">OK</button>
         </div>`,
        {imports: [AriaIdRefHarness]},
      );
      await expectNoA11yViolations(container);
    });

    it('data-state harness: no axe violations (data-* is presentational only)', async () => {
      const {container} = await render(
        `<button dataState data-disabled="soft" aria-disabled="true">x</button>`,
        {imports: [DataStateHarness]},
      );
      await expectNoA11yViolations(container);
    });
  });
});
