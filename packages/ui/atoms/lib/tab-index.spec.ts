import {render, screen} from '@testing-library/angular';
import {userEvent} from '@testing-library/user-event';
import {expectNoA11yViolations} from '../../test-axe';
import {TabIndex} from './tab-index';

describe('TabIndex atom', () => {
  describe('initial value', () => {
    it('defaults to 0 when no tabindex attribute is present', async () => {
      await render(`<button tabIndex>ok</button>`, {imports: [TabIndex]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('reads initial tabindex from the host attribute', async () => {
      await render(`<div tabIndex role="button" tabindex="4">ok</div>`, {imports: [TabIndex]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 4);
    });

    it('reads negative initial tabindex', async () => {
      await render(`<div tabIndex role="button" tabindex="-1">ok</div>`, {imports: [TabIndex]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', -1);
    });
  });

  describe('input binding', () => {
    it('lets [tabIndex]="n" override the initial value', async () => {
      await render(`<div tabIndex role="button" [tabIndex]="2">ok</div>`, {imports: [TabIndex]});
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 2);
    });

    it('updates when the bound input changes', async () => {
      const {rerender} = await render(`<div tabIndex role="button" [tabIndex]="idx">ok</div>`, {
        imports: [TabIndex],
        componentProperties: {idx: 0},
      });
      const el = screen.getByRole('button');
      expect(el).toHaveProperty('tabIndex', 0);

      await rerender({componentProperties: {idx: -1}});
      expect(el).toHaveProperty('tabIndex', -1);

      await rerender({componentProperties: {idx: 3}});
      expect(el).toHaveProperty('tabIndex', 3);
    });
  });

  describe('focusability', () => {
    it('tabindex=0 makes a non-native host reachable via Tab', async () => {
      await render(
        `<div>
          <button>first</button>
          <div tabIndex role="button" [tabIndex]="0">target</div>
        </div>`,
        {imports: [TabIndex]},
      );
      await userEvent.tab();
      expect(screen.getByRole('button', {name: 'first'})).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole('button', {name: 'target'})).toHaveFocus();
    });

    it('tabindex=-1 removes a non-native host from Tab order', async () => {
      await render(
        `<div>
          <button>first</button>
          <div tabIndex role="button" [tabIndex]="-1">target</div>
          <button>last</button>
        </div>`,
        {imports: [TabIndex]},
      );
      await userEvent.tab();
      expect(screen.getByRole('button', {name: 'first'})).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole('button', {name: 'last'})).toHaveFocus();
    });
  });

  describe('a11y', () => {
    it('no axe violations on tabbable non-native button', async () => {
      const {container} = await render(
        `<div tabIndex role="button" [tabIndex]="0" aria-label="Go">Go</div>`,
        {imports: [TabIndex]},
      );
      await expectNoA11yViolations(container);
    });
  });
});
