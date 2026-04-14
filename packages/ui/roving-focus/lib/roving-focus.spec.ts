import {Component, signal} from '@angular/core';
import {Disabler} from '@terseware/ui/atoms';
import {render, screen, within} from '@testing-library/angular';
import {userEvent} from '@testing-library/user-event';
import {expectNoA11yViolations} from '../../test-axe';
import {RovingFocus} from './roving-focus';
import {RovingFocusItem} from './roving-focus-item';

const IMPORTS = [RovingFocus, RovingFocusItem, Disabler];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Query every button in the test's default group. Using `getByRole` means a
 * regression that strips the button role from an item would fail the test
 * rather than silently working via a testid fallback.
 */
function getItems(): HTMLElement[] {
  return screen.getAllByRole('button');
}

function getItem(name: string): HTMLElement {
  return screen.getByRole('button', {name});
}

/**
 * Renders the standard three-item vertical group. The first and third items
 * are soft-disabled to exercise the "soft-disabled stays in traversal order"
 * rule. The middle item is fully enabled so it can act as a reachable
 * default tab stop for tests that don't care about disabled-state filtering.
 */
const VERTICAL_TEMPLATE = `
  <div rovingFocus role="toolbar" aria-label="actions">
    <button rovingFocusItem disabled softDisabled>Apple</button>
    <button rovingFocusItem>Banana</button>
    <button rovingFocusItem disabled softDisabled>Cherry</button>
  </div>
`;

const HORIZONTAL_TEMPLATE = `
  <div rovingFocus role="toolbar" orientation="horizontal" aria-label="tools">
    <button rovingFocusItem>One</button>
    <button rovingFocusItem>Two</button>
    <button rovingFocusItem disabled softDisabled>Three</button>
  </div>
`;

describe('RovingFocus', () => {
  // -------------------------------------------------------------------------
  // Initial tab stop — the group MUST be reachable from the outer tab order.
  // This is APG roving-tabindex guidance: exactly one item holds tabindex=0
  // before any user interaction.
  // -------------------------------------------------------------------------

  describe('initial tab stop', () => {
    it('places tabindex=0 on the first non-hard-disabled item at mount', async () => {
      await render(
        `<div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem>Apple</button>
           <button rovingFocusItem>Banana</button>
           <button rovingFocusItem>Cherry</button>
         </div>`,
        {imports: IMPORTS},
      );
      const [apple, banana, cherry] = getItems();
      expect(apple).toHaveAttribute('tabindex', '0');
      expect(banana).toHaveAttribute('tabindex', '-1');
      expect(cherry).toHaveAttribute('tabindex', '-1');
    });

    it('skips hard-disabled items when choosing the initial tab stop', async () => {
      await render(
        `<div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem disabled>Apple</button>
           <button rovingFocusItem>Banana</button>
           <button rovingFocusItem>Cherry</button>
         </div>`,
        {imports: IMPORTS},
      );
      expect(getItem('Apple')).toHaveAttribute('tabindex', '-1');
      expect(getItem('Banana')).toHaveAttribute('tabindex', '0');
      expect(getItem('Cherry')).toHaveAttribute('tabindex', '-1');
    });

    it('keeps soft-disabled items eligible for the initial tab stop', async () => {
      // Soft-disabled items are focusable (activation is separately blocked),
      // so they remain part of the traversal set and can be the first tab
      // stop if there's nothing better in front of them.
      await render(
        `<div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem disabled softDisabled>Apple</button>
           <button rovingFocusItem>Banana</button>
         </div>`,
        {imports: IMPORTS},
      );
      expect(getItem('Apple')).toHaveAttribute('tabindex', '0');
      expect(getItem('Banana')).toHaveAttribute('tabindex', '-1');
    });

    it('makes the group reachable by Tab from a previous focusable', async () => {
      await render(
        `<button>outside</button>
         <div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem>Apple</button>
           <button rovingFocusItem>Banana</button>
         </div>`,
        {imports: IMPORTS},
      );
      await userEvent.tab();
      expect(getItem('outside')).toHaveFocus();
      await userEvent.tab();
      expect(getItem('Apple')).toHaveFocus();
    });

    it('Shift+Tab exits the group to the previous focusable', async () => {
      await render(
        `<button>outside</button>
         <div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem>Apple</button>
           <button rovingFocusItem>Banana</button>
         </div>`,
        {imports: IMPORTS},
      );
      getItem('Apple').focus();
      await userEvent.tab({shift: true});
      expect(getItem('outside')).toHaveFocus();
    });

    it('Tab from inside the group exits to the next focusable (one tab stop)', async () => {
      await render(
        `<div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem>Apple</button>
           <button rovingFocusItem>Banana</button>
         </div>
         <button>after</button>`,
        {imports: IMPORTS},
      );
      getItem('Apple').focus();
      await userEvent.tab();
      expect(getItem('after')).toHaveFocus();
    });
  });

  // -------------------------------------------------------------------------
  // Tab-stop follows focus — once an item takes focus it becomes the stop.
  // -------------------------------------------------------------------------

  describe('tabindex management', () => {
    it('transfers tabindex=0 to whichever item takes focus', async () => {
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      const apple = getItem('Apple');
      const banana = getItem('Banana');
      const cherry = getItem('Cherry');

      // Initial: Apple is the tab stop (first non-hard-disabled).
      expect(apple).toHaveAttribute('tabindex', '0');
      expect(banana).toHaveAttribute('tabindex', '-1');
      expect(cherry).toHaveAttribute('tabindex', '-1');

      apple.focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(banana).toHaveFocus();
      expect(banana).toHaveAttribute('tabindex', '0');
      expect(apple).toHaveAttribute('tabindex', '-1');

      await userEvent.keyboard('{ArrowDown}');
      expect(cherry).toHaveFocus();
      expect(cherry).toHaveAttribute('tabindex', '0');
      expect(banana).toHaveAttribute('tabindex', '-1');
    });

    it('returning focus into the group lands on the most-recently-active item', async () => {
      await render(
        `<button>outside</button>
         <div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem>Apple</button>
           <button rovingFocusItem>Banana</button>
           <button rovingFocusItem>Cherry</button>
         </div>`,
        {imports: IMPORTS},
      );
      // Walk to Banana via the keyboard.
      getItem('Apple').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Banana')).toHaveFocus();

      // Leave the group.
      getItem('outside').focus();
      expect(getItem('outside')).toHaveFocus();

      // Re-entering by Tab from outside lands back on Banana, not Apple.
      await userEvent.tab();
      expect(getItem('Banana')).toHaveFocus();
      expect(getItem('Banana')).toHaveAttribute('tabindex', '0');
    });
  });

  // -------------------------------------------------------------------------
  // Vertical navigation
  // -------------------------------------------------------------------------

  describe('vertical navigation', () => {
    it('ArrowDown moves focus forward, skipping soft-disabled is NOT allowed', async () => {
      // Soft-disabled items stay in the tab sequence — only hard-disabled
      // items are skipped. This test pins that rule.
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      getItem('Apple').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Banana')).toHaveFocus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Cherry')).toHaveFocus();
    });

    it('ArrowUp moves focus backward', async () => {
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      getItem('Cherry').focus();
      await userEvent.keyboard('{ArrowUp}');
      expect(getItem('Banana')).toHaveFocus();
      await userEvent.keyboard('{ArrowUp}');
      expect(getItem('Apple')).toHaveFocus();
    });

    it('ArrowLeft/ArrowRight are no-ops in vertical mode', async () => {
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      getItem('Banana').focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(getItem('Banana')).toHaveFocus();
      await userEvent.keyboard('{ArrowLeft}');
      expect(getItem('Banana')).toHaveFocus();
    });

    it('does not preventDefault on off-axis arrow keys (event bubbles naturally)', async () => {
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      const el = getItem('Banana');
      el.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });

    it('reflects aria-orientation="vertical" when the host has an orientation-bearing role', async () => {
      // Toolbar's role default is horizontal; a vertical toolbar SHOULD
      // advertise aria-orientation="vertical" so assistive tech switches
      // arrow-key expectations.
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      expect(screen.getByRole('toolbar', {name: 'actions'})).toHaveAttribute(
        'aria-orientation',
        'vertical',
      );
    });

    it('does NOT set aria-orientation when the host has no orientation-bearing role', async () => {
      // A plain <div> without a role cannot carry aria-orientation — axe's
      // aria-allowed-attr rule would flag it as unsupported. Verify the
      // directive stays silent in that case rather than forcing the attr.
      const {container} = await render(
        `<div rovingFocus>
           <button rovingFocusItem>One</button>
           <button rovingFocusItem>Two</button>
         </div>`,
        {imports: IMPORTS},
      );
      const group = container.querySelector('[rovingFocus]');
      expect(group).not.toHaveAttribute('aria-orientation');
    });
  });

  // -------------------------------------------------------------------------
  // Horizontal navigation
  // -------------------------------------------------------------------------

  describe('horizontal navigation', () => {
    it('reflects aria-orientation="horizontal" on the container', async () => {
      // Critical APG bit: an orientation-bearing container MUST advertise it
      // via aria-orientation so assistive tech knows which arrow keys are
      // meaningful. The Orientation atom handles this reflection.
      const {container} = await render(HORIZONTAL_TEMPLATE, {imports: IMPORTS});
      const group = container.querySelector('[rovingFocus]');
      expect(group).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('ArrowRight moves focus forward', async () => {
      await render(HORIZONTAL_TEMPLATE, {imports: IMPORTS});
      getItem('One').focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(getItem('Two')).toHaveFocus();
    });

    it('ArrowLeft moves focus backward', async () => {
      await render(HORIZONTAL_TEMPLATE, {imports: IMPORTS});
      getItem('Two').focus();
      await userEvent.keyboard('{ArrowLeft}');
      expect(getItem('One')).toHaveFocus();
    });

    it('ArrowUp/ArrowDown are no-ops in horizontal mode', async () => {
      await render(HORIZONTAL_TEMPLATE, {imports: IMPORTS});
      getItem('One').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('One')).toHaveFocus();
      await userEvent.keyboard('{ArrowUp}');
      expect(getItem('One')).toHaveFocus();
    });
  });

  // -------------------------------------------------------------------------
  // Wrap behavior
  // -------------------------------------------------------------------------

  describe('wrap', () => {
    it('wraps from last to first on ArrowDown', async () => {
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      getItem('Cherry').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Apple')).toHaveFocus();
    });

    it('wraps from first to last on ArrowUp', async () => {
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      getItem('Apple').focus();
      await userEvent.keyboard('{ArrowUp}');
      expect(getItem('Cherry')).toHaveFocus();
    });

    it('does not wrap when [rovingFocusWrap]="false"', async () => {
      await render(
        `<div rovingFocus role="toolbar" [rovingFocusWrap]="false" aria-label="actions">
           <button rovingFocusItem>Apple</button>
           <button rovingFocusItem>Banana</button>
           <button rovingFocusItem>Cherry</button>
         </div>`,
        {imports: IMPORTS},
      );
      getItem('Cherry').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Cherry')).toHaveFocus();
      getItem('Apple').focus();
      await userEvent.keyboard('{ArrowUp}');
      expect(getItem('Apple')).toHaveFocus();
    });
  });

  // -------------------------------------------------------------------------
  // Home / End
  // -------------------------------------------------------------------------

  describe('Home/End', () => {
    it('Home moves focus to the first reachable item', async () => {
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      getItem('Cherry').focus();
      await userEvent.keyboard('{Home}');
      // Apple is soft-disabled → still reachable and is the first item.
      expect(getItem('Apple')).toHaveFocus();
    });

    it('Home skips leading hard-disabled items', async () => {
      await render(
        `<div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem disabled>Apple</button>
           <button rovingFocusItem>Banana</button>
           <button rovingFocusItem>Cherry</button>
         </div>`,
        {imports: IMPORTS},
      );
      getItem('Cherry').focus();
      await userEvent.keyboard('{Home}');
      expect(getItem('Banana')).toHaveFocus();
    });

    it('End moves focus to the last reachable item', async () => {
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      getItem('Apple').focus();
      await userEvent.keyboard('{End}');
      expect(getItem('Cherry')).toHaveFocus();
    });

    it('End skips trailing hard-disabled items', async () => {
      await render(
        `<div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem>Apple</button>
           <button rovingFocusItem>Banana</button>
           <button rovingFocusItem disabled>Cherry</button>
         </div>`,
        {imports: IMPORTS},
      );
      getItem('Apple').focus();
      await userEvent.keyboard('{End}');
      expect(getItem('Banana')).toHaveFocus();
    });

    it('Home/End are no-ops when [rovingFocusHomeEnd]="false"', async () => {
      await render(
        `<div rovingFocus role="toolbar" [rovingFocusHomeEnd]="false" aria-label="actions">
           <button rovingFocusItem>One</button>
           <button rovingFocusItem>Two</button>
           <button rovingFocusItem>Three</button>
         </div>`,
        {imports: IMPORTS},
      );
      getItem('Two').focus();
      await userEvent.keyboard('{Home}');
      expect(getItem('Two')).toHaveFocus();
      await userEvent.keyboard('{End}');
      expect(getItem('Two')).toHaveFocus();
    });

    it('does not preventDefault Home/End when the feature is disabled', async () => {
      await render(
        `<div rovingFocus role="toolbar" [rovingFocusHomeEnd]="false" aria-label="actions">
           <button rovingFocusItem>One</button>
           <button rovingFocusItem>Two</button>
         </div>`,
        {imports: IMPORTS},
      );
      const el = getItem('One');
      el.focus();
      const event = new KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Disabled item handling — hard vs soft
  // -------------------------------------------------------------------------

  describe('hard-disabled items', () => {
    it('navigation skips hard-disabled items', async () => {
      await render(
        `<div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem>Apple</button>
           <button rovingFocusItem disabled>Banana</button>
           <button rovingFocusItem>Cherry</button>
         </div>`,
        {imports: IMPORTS},
      );
      getItem('Apple').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Cherry')).toHaveFocus();
    });

    it('wrap traversal skips hard-disabled items', async () => {
      await render(
        `<div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem disabled softDisabled>Apple</button>
           <button rovingFocusItem>Banana</button>
           <button rovingFocusItem disabled>Cherry</button>
         </div>`,
        {imports: IMPORTS},
      );
      // Apple is soft-disabled (reachable), Cherry is hard-disabled (skipped).
      getItem('Apple').focus();
      await userEvent.keyboard('{ArrowUp}');
      // Up from Apple wraps past Cherry (skipped) to Banana.
      expect(getItem('Banana')).toHaveFocus();
    });
  });

  describe('soft-disabled items', () => {
    it('soft-disabled items stay in the traversal order', async () => {
      // Standard vertical template has Apple (soft) + Banana + Cherry (soft).
      // From Banana, ArrowDown must land on Cherry because soft-disabled
      // items remain reachable.
      await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      getItem('Banana').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Cherry')).toHaveFocus();
    });
  });

  // -------------------------------------------------------------------------
  // Group disabled via rovingFocus=false
  // -------------------------------------------------------------------------

  describe('enabled=false', () => {
    it('ignores arrow keys when the group is disabled', async () => {
      await render(
        `<div rovingFocus role="toolbar" [rovingFocus]="false" aria-label="actions">
           <button rovingFocusItem>One</button>
           <button rovingFocusItem>Two</button>
         </div>`,
        {imports: IMPORTS},
      );
      getItem('One').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('One')).toHaveFocus();
    });

    it('ignores Home/End when the group is disabled', async () => {
      await render(
        `<div rovingFocus role="toolbar" [rovingFocus]="false" aria-label="actions">
           <button rovingFocusItem>One</button>
           <button rovingFocusItem>Two</button>
         </div>`,
        {imports: IMPORTS},
      );
      getItem('Two').focus();
      await userEvent.keyboard('{Home}');
      expect(getItem('Two')).toHaveFocus();
    });
  });

  // -------------------------------------------------------------------------
  // Dynamic items — the tab stop must re-compute when the list changes.
  // -------------------------------------------------------------------------

  describe('dynamic items', () => {
    it('promotes a new first item to the tab stop when items change', async () => {
      @Component({
        selector: 'test-host',
        imports: IMPORTS,
        template: `
          <div aria-label="actions" role="toolbar" rovingFocus>
            @for (label of labels(); track label) {
              <button rovingFocusItem>{{ label }}</button>
            }
          </div>
        `,
      })
      class Host {
        readonly labels = signal(['Alpha', 'Beta']);
      }

      const {fixture} = await render(Host);
      expect(getItem('Alpha')).toHaveAttribute('tabindex', '0');
      expect(getItem('Beta')).toHaveAttribute('tabindex', '-1');

      // Prepend a new first item — it should become the tab stop.
      fixture.componentInstance.labels.set(['Zero', 'Alpha', 'Beta']);
      fixture.detectChanges();

      expect(getItem('Zero')).toHaveAttribute('tabindex', '0');
      expect(getItem('Alpha')).toHaveAttribute('tabindex', '-1');
      expect(getItem('Beta')).toHaveAttribute('tabindex', '-1');
    });

    it('falls back to the first reachable item when the active item is removed', async () => {
      @Component({
        selector: 'test-host',
        imports: IMPORTS,
        template: `
          <div aria-label="actions" role="toolbar" rovingFocus>
            @for (label of labels(); track label) {
              <button rovingFocusItem>{{ label }}</button>
            }
          </div>
        `,
      })
      class Host {
        readonly labels = signal(['Alpha', 'Beta', 'Gamma']);
      }

      const {fixture} = await render(Host);
      // Move focus to Beta so it becomes the active tab stop.
      getItem('Alpha').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Beta')).toHaveFocus();
      expect(getItem('Beta')).toHaveAttribute('tabindex', '0');

      // Remove Beta from the list.
      fixture.componentInstance.labels.set(['Alpha', 'Gamma']);
      fixture.detectChanges();

      // Alpha (the first reachable item) takes the tab stop back.
      expect(getItem('Alpha')).toHaveAttribute('tabindex', '0');
      expect(getItem('Gamma')).toHaveAttribute('tabindex', '-1');
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('does not throw when navigating an empty group', async () => {
      const {container} = await render(`<div rovingFocus aria-label="empty"></div>`, {
        imports: IMPORTS,
      });
      const group = container.querySelector('[rovingFocus]') as HTMLElement;
      group.tabIndex = 0;
      group.focus();

      const down = new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true});
      const home = new KeyboardEvent('keydown', {key: 'Home', bubbles: true});
      const end = new KeyboardEvent('keydown', {key: 'End', bubbles: true});

      expect(() => group.dispatchEvent(down)).not.toThrow();
      expect(() => group.dispatchEvent(home)).not.toThrow();
      expect(() => group.dispatchEvent(end)).not.toThrow();
    });

    it('group with only hard-disabled items has no tab stop', async () => {
      await render(
        `<div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem disabled>One</button>
           <button rovingFocusItem disabled>Two</button>
         </div>`,
        {imports: IMPORTS},
      );
      // Every item is hard-disabled → both render tabindex=-1 (group is not
      // reachable, which is correct: there is nothing to land on).
      expect(getItem('One')).toHaveAttribute('tabindex', '-1');
      expect(getItem('Two')).toHaveAttribute('tabindex', '-1');
    });
  });

  // -------------------------------------------------------------------------
  // Axe a11y sweep
  // -------------------------------------------------------------------------

  describe('axe a11y', () => {
    it('vertical group: no violations', async () => {
      const {container} = await render(VERTICAL_TEMPLATE, {imports: IMPORTS});
      await expectNoA11yViolations(container);
    });

    it('horizontal group: no violations (aria-orientation present)', async () => {
      const {container} = await render(HORIZONTAL_TEMPLATE, {imports: IMPORTS});
      await expectNoA11yViolations(container);
    });

    it('group with a mix of hard and soft disabled items: no violations', async () => {
      const {container} = await render(
        `<div rovingFocus role="toolbar" aria-label="actions">
           <button rovingFocusItem>Enabled</button>
           <button rovingFocusItem disabled aria-label="Hard disabled">HD</button>
           <button rovingFocusItem disabled softDisabled aria-label="Soft disabled">SD</button>
         </div>`,
        {imports: IMPORTS},
      );
      await expectNoA11yViolations(container);
    });

    it('group scoped by aria-label is queryable by that label (group landmark semantics)', async () => {
      // A RovingFocus container with role="toolbar" and an accessible name is
      // the most common APG shape. Verify the composed directive is compatible
      // with that role + name + axe pipeline.
      const {container} = await render(
        `<div rovingFocus orientation="horizontal" role="toolbar" aria-label="Editor tools">
           <button rovingFocusItem aria-label="Bold">B</button>
           <button rovingFocusItem aria-label="Italic">I</button>
           <button rovingFocusItem aria-label="Underline">U</button>
         </div>`,
        {imports: IMPORTS},
      );
      const toolbar = screen.getByRole('toolbar', {name: 'Editor tools'});
      expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');
      expect(within(toolbar).getByRole('button', {name: 'Bold'})).toHaveAttribute('tabindex', '0');
      await expectNoA11yViolations(container);
    });
  });
});
