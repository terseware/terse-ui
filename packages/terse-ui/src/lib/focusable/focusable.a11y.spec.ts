import {render} from '@testing-library/angular';
import {expectNoA11yViolations} from '../../../test-axe';
import {TerseFocusable} from './terse-focusable';

// ---------------------------------------------------------------------------
// Axe sweep for Disabler-only usage. Non-native elements carry an explicit
// role because Disabler does not auto-assign one.
// ---------------------------------------------------------------------------

describe(TerseFocusable.name + ' a11y', () => {
  it('native <button> enabled', async () => {
    const {container} = await render(`<button terseFocusable>Save</button>`, {
      imports: [TerseFocusable],
    });
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('native <button> hard-disabled', async () => {
    const {container} = await render(
      `<button terseFocusable disabled aria-label="Save">Save</button>`,
      {imports: [TerseFocusable]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('native <button> soft-disabled keeps aria-disabled + stays tabbable', async () => {
    const {container} = await render(
      `<button terseFocusable disabled="soft" aria-label="Save">Save</button>`,
      {imports: [TerseFocusable]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('non-native <div role=button> hard-disabled', async () => {
    const {container} = await render(
      `<div terseFocusable role="button" disabled aria-label="Do it">Do it</div>`,
      {imports: [TerseFocusable]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('non-native <div role=button> soft-disabled', async () => {
    const {container} = await render(
      `<div terseFocusable role="button" disabled="soft" aria-label="Do it">Do it</div>`,
      {imports: [TerseFocusable]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('anchor with href disabled preserves link role + adds aria-disabled', async () => {
    const {container} = await render(`<a terseFocusable href="/docs" disabled>Docs</a>`, {
      imports: [TerseFocusable],
    });
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('<input type=submit> disabled inside a form', async () => {
    const {container} = await render(
      `<form><input terseFocusable type="submit" disabled value="Save" /></form>`,
      {imports: [TerseFocusable]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('disabled-state transitions stay axe-clean', async () => {
    const {rerender, container} = await render(
      `<button terseFocusable [disabled]="d" aria-label="Go">Go</button>`,
      {imports: [TerseFocusable], componentProperties: {d: false as boolean | 'soft'}},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();

    await rerender({componentProperties: {d: true}});
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();

    await rerender({componentProperties: {d: 'soft'}});
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();

    await rerender({componentProperties: {d: false}});
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('custom role (tab inside tablist) survives disabled transitions', async () => {
    // role="tab" requires an ancestor role="tablist" — wrap accordingly so
    // axe's aria-required-parent rule doesn't flag the standalone tab.
    const {rerender, container} = await render(
      `<div role="tablist" aria-label="sections">
         <div terseFocusable role="tab" [disabled]="d" aria-selected="false">Tab</div>
       </div>`,
      {imports: [TerseFocusable], componentProperties: {d: false as boolean | 'soft'}},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();

    await rerender({componentProperties: {d: true}});
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();

    await rerender({componentProperties: {d: 'soft'}});
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });
});
