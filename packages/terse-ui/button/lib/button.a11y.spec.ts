import {render} from '@testing-library/angular';
import {expectNoA11yViolations} from '../../test-axe';
import {TerseButton} from './terse-button';

describe(TerseButton.name + ' a11y', () => {
  it('native button with text content', async () => {
    const {container} = await render(`<button terseButton>Save</button>`, {
      imports: [TerseButton],
    });
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('native button with aria-label (icon button)', async () => {
    const {container} = await render(`<button terseButton aria-label="Close">×</button>`, {
      imports: [TerseButton],
    });
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('native button with type=submit in a form', async () => {
    const {container} = await render(
      `<form><button terseButton type="submit">Submit</button></form>`,
      {imports: [TerseButton]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('native button hard-disabled', async () => {
    const {container} = await render(
      `<button terseButton disabled aria-label="Submit">Submit</button>`,
      {imports: [TerseButton]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('native button soft-disabled (focusable, aria-disabled)', async () => {
    const {container} = await render(
      `<button terseButton disabled="soft" aria-label="Submit">Submit</button>`,
      {imports: [TerseButton]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('non-native <span role=button> with accessible name', async () => {
    const {container} = await render(`<span terseButton role="button" aria-label="Go">Go</span>`, {
      imports: [TerseButton],
    });
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('non-native <div> hard-disabled gets role=button and aria-disabled', async () => {
    const {container} = await render(`<div terseButton disabled aria-label="Do it">Do it</div>`, {
      imports: [TerseButton],
    });
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('non-native <div> soft-disabled remains tabbable and axe-clean', async () => {
    const {container} = await render(
      `<div terseButton disabled="soft" aria-label="Do it">Do it</div>`,
      {imports: [TerseButton]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('anchor with href exposes role=link and is axe-clean', async () => {
    const {container} = await render(`<a terseButton href="/docs">Docs</a>`, {
      imports: [TerseButton],
    });
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('anchor without href is axe-clean when it has a non-link role', async () => {
    // Anchors without href do not have the link role. Button composition
    // falls through to role=button on these, so axe treats them as buttons.
    const {container} = await render(`<a terseButton aria-label="toggle">Toggle</a>`, {
      imports: [TerseButton],
    });
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('<input type=button> with value as accessible name', async () => {
    const {container} = await render(`<input terseButton type="button" value="Run" />`, {
      imports: [TerseButton],
    });
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('<input type=submit> inside a form', async () => {
    const {container} = await render(
      `<form><input terseButton type="submit" value="Save" /></form>`,
      {
        imports: [TerseButton],
      },
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('button with explicit tabIndex override remains axe-clean', async () => {
    const {container} = await render(
      `<button terseButton [tabIndex]="-1" aria-label="Skip">Skip</button>`,
      {imports: [TerseButton]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('button with role override (menuitem) is axe-clean inside a menu', async () => {
    const {container} = await render(
      `<div role="menu" aria-label="actions">
           <button terseButton role="menuitem">Rename</button>
           <button terseButton role="menuitem">Delete</button>
         </div>`,
      {imports: [TerseButton]},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });

  it('disabled-state transitions keep the DOM axe-clean throughout', async () => {
    const {rerender, container} = await render(
      `<button terseButton [disabled]="disabled" aria-label="Go">Go</button>`,
      {imports: [TerseButton], componentProperties: {disabled: false as boolean | 'soft'}},
    );
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();

    await rerender({componentProperties: {disabled: true}});
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();

    await rerender({componentProperties: {disabled: 'soft'}});
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();

    await rerender({componentProperties: {disabled: false}});
    await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
  });
});
