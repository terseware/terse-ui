import {Component, signal} from '@angular/core';
import type {ComponentFixture} from '@angular/core/testing';
import {fireEvent, render, screen, within} from '@testing-library/angular';
import {userEvent} from '@testing-library/user-event';
import {expectNoA11yViolations} from '../../test-axe';
import {Menu} from './menu';
import {TerseMenu} from './terse-menu';
import {TerseMenuItem} from './terse-menu-item';
import {TerseMenuTrigger} from './terse-menu-trigger';

@Component({
  selector: 'test-basic-menu',
  imports: [TerseMenuTrigger, TerseMenu, TerseMenuItem],
  template: `
    <button terseMenuTrigger [terseMenuTriggerFor]="menuTpl">Open Menu</button>
    <ng-template #menuTpl>
      <div aria-label="Actions" terseMenu>
        <button terseMenuItem>Apple</button>
        <button terseMenuItem>Banana</button>
        <button terseMenuItem>Cherry</button>
      </div>
    </ng-template>
    <button>after</button>
  `,
})
class BasicMenuHost {}

@Component({
  selector: 'test-dynamic-menu',
  imports: [TerseMenuTrigger, TerseMenu, TerseMenuItem],
  template: `
    <button terseMenuTrigger [terseMenuTriggerFor]="menuTpl">Open Menu</button>
    <ng-template #menuTpl>
      <div aria-label="Actions" terseMenu>
        @for (label of labels(); track label) {
          <button terseMenuItem>{{ label }}</button>
        }
      </div>
    </ng-template>
  `,
})
class DynamicMenuHost {
  readonly labels = signal(['Alpha', 'Beta', 'Gamma']);
}

@Component({
  selector: 'test-disabled-item-menu',
  imports: [TerseMenuTrigger, TerseMenu, TerseMenuItem],
  template: `
    <button terseMenuTrigger [terseMenuTriggerFor]="menuTpl">Open Menu</button>
    <ng-template #menuTpl>
      <div aria-label="Actions" terseMenu>
        <button terseMenuItem>Apple</button>
        <button disabled terseMenuItem>Banana</button>
        <button terseMenuItem>Cherry</button>
      </div>
    </ng-template>
  `,
})
class DisabledItemMenuHost {}

@Component({
  selector: 'test-submenu',
  imports: [TerseMenuTrigger, TerseMenu, TerseMenuItem],
  template: `
    <button terseMenuTrigger [terseMenuTriggerFor]="topTpl">Open Menu</button>
    <ng-template #topTpl>
      <div aria-label="Top" terseMenu>
        <button terseMenuItem>Apple</button>
        <button terseMenuItem terseMenuTrigger [terseMenuTriggerFor]="subTpl">More</button>
        <button terseMenuItem>Cherry</button>
      </div>
    </ng-template>
    <ng-template #subTpl>
      <div aria-label="More" terseMenu>
        <button terseMenuItem>Sub One</button>
        <button terseMenuItem>Sub Two</button>
      </div>
    </ng-template>
  `,
})
class SubmenuHost {}

function getTrigger(name = 'Open Menu'): HTMLElement {
  return screen.getByRole('button', {name});
}

function queryMenu(name?: string): HTMLElement | null {
  return name ? screen.queryByRole('menu', {name}) : screen.queryByRole('menu');
}

function getMenu(name?: string): HTMLElement {
  return name ? screen.getByRole('menu', {name}) : screen.getByRole('menu');
}

function getItem(name: string): HTMLElement {
  return screen.getByRole('menuitem', {name});
}

function getItems(): HTMLElement[] {
  return screen.getAllByRole('menuitem');
}

function openMenu(fixture: ComponentFixture<unknown>, triggerName = 'Open Menu'): void {
  fireEvent.mouseDown(getTrigger(triggerName));
  fixture.detectChanges();
}

describe('Menu', () => {
  describe('aria shape', () => {
    it('trigger exposes role=button and aria-haspopup="menu"', async () => {
      await render(BasicMenuHost);
      const trigger = getTrigger();
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('trigger reports aria-expanded that tracks the open state', async () => {
      const {fixture} = await render(BasicMenuHost);
      const trigger = getTrigger();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      openMenu(fixture);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      await userEvent.keyboard('{Escape}');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('open menu is queryable by role + accessible name', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      expect(screen.getByRole('menu', {name: 'Actions'})).toBeInTheDocument();
    });

    it('aria-controls on trigger exactly matches the menu id when open', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      const menuId = getMenu().id;
      expect(menuId).toBeTruthy();
      expect(getTrigger()).toHaveAttribute('aria-controls', menuId);
    });

    it('clears aria-controls on the trigger after close', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      expect(getTrigger()).toHaveAttribute('aria-controls');

      await userEvent.keyboard('{Escape}');
      expect(getTrigger()).not.toHaveAttribute('aria-controls');
    });

    it('every menu item carries role=menuitem', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      const items = getItems();
      expect(items).toHaveLength(3);
      for (const item of items) {
        expect(item).toHaveAttribute('role', 'menuitem');
      }
    });

    it('trigger reflects data-opened / data-closed state markers', async () => {
      const {fixture} = await render(BasicMenuHost);
      const trigger = getTrigger();
      expect(trigger).toHaveAttribute('data-closed');
      expect(trigger).not.toHaveAttribute('data-opened');

      openMenu(fixture);
      expect(trigger).toHaveAttribute('data-opened');
      expect(trigger).not.toHaveAttribute('data-closed');
    });
  });

  describe('open and close', () => {
    it('opens on a real pointer click of the trigger', async () => {
      const {fixture} = await render(BasicMenuHost);
      expect(queryMenu()).not.toBeInTheDocument();
      openMenu(fixture);
      expect(getMenu()).toBeInTheDocument();
    });

    it('a second click on an open trigger closes it', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      expect(queryMenu()).toBeInTheDocument();

      await userEvent.click(getTrigger());
      expect(queryMenu()).not.toBeInTheDocument();
    });

    it('closes on Escape while focus is inside the menu', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      expect(queryMenu()).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');
      expect(queryMenu()).not.toBeInTheDocument();
    });

    it('closes when a menu item is activated by click', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      await userEvent.click(getItem('Apple'));
      expect(queryMenu()).not.toBeInTheDocument();
    });

    it('closes on outside click', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      expect(queryMenu()).toBeInTheDocument();

      await userEvent.click(getTrigger('after'));
      expect(queryMenu()).not.toBeInTheDocument();
    });

    it('Tab inside an open menu closes it and preventDefaults the key', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      const menu = getMenu();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      menu.dispatchEvent(event);
      fixture.detectChanges();

      expect(event.defaultPrevented).toBe(true);
      expect(queryMenu()).not.toBeInTheDocument();
    });

    it('Escape on a closed, focused trigger does not preventDefault (stays unbound)', async () => {
      await render(BasicMenuHost);
      const trigger = getTrigger();
      trigger.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      trigger.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });

    it('Space on a focused trigger opens the menu', async () => {
      const {fixture} = await render(BasicMenuHost);
      const trigger = getTrigger();
      trigger.focus();

      fireEvent.keyDown(trigger, {key: ' '});
      fixture.detectChanges();
      await fixture.whenStable();

      expect(queryMenu()).toBeInTheDocument();
    });

    it('Enter on a focused trigger opens the menu', async () => {
      const {fixture} = await render(BasicMenuHost);
      const trigger = getTrigger();
      trigger.focus();

      fireEvent.keyDown(trigger, {key: 'Enter'});
      fixture.detectChanges();
      await fixture.whenStable();

      expect(queryMenu()).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowDown on a closed trigger opens the menu and focuses the first item', async () => {
      const {fixture} = await render(BasicMenuHost);
      getTrigger().focus();
      await userEvent.keyboard('{ArrowDown}');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(queryMenu()).toBeInTheDocument();
      expect(getItem('Apple')).toHaveFocus();
    });

    it('ArrowUp on a closed trigger opens the menu and focuses the last item', async () => {
      const {fixture} = await render(BasicMenuHost);
      getTrigger().focus();
      await userEvent.keyboard('{ArrowUp}');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(queryMenu()).toBeInTheDocument();
      expect(getItem('Cherry')).toHaveFocus();
    });

    it('ArrowDown/ArrowUp walk through items', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      expect(getItem('Apple')).toHaveFocus();

      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Banana')).toHaveFocus();

      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Cherry')).toHaveFocus();

      await userEvent.keyboard('{ArrowUp}');
      expect(getItem('Banana')).toHaveFocus();
    });

    it('wraps from last to first on ArrowDown', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      getItem('Cherry').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Apple')).toHaveFocus();
    });

    it('wraps from first to last on ArrowUp', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      getItem('Apple').focus();
      await userEvent.keyboard('{ArrowUp}');
      expect(getItem('Cherry')).toHaveFocus();
    });

    it('Home moves focus to the first item', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      getItem('Cherry').focus();
      await userEvent.keyboard('{Home}');
      expect(getItem('Apple')).toHaveFocus();
    });

    it('End moves focus to the last item', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      getItem('Apple').focus();
      await userEvent.keyboard('{End}');
      expect(getItem('Cherry')).toHaveFocus();
    });

    it('skips hard-disabled items during arrow traversal', async () => {
      const {fixture} = await render(DisabledItemMenuHost);
      openMenu(fixture);
      expect(getItem('Apple')).toHaveFocus();

      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Cherry')).toHaveFocus();
    });
  });

  describe('focus management', () => {
    it('focuses the first item when the menu opens via pointer', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      expect(getItem('Apple')).toHaveFocus();
    });

    it('returns focus to the trigger when the menu closes via Escape', async () => {
      const {fixture} = await render(BasicMenuHost);
      getTrigger().focus();
      openMenu(fixture);

      await userEvent.keyboard('{Escape}');
      expect(getTrigger()).toHaveFocus();
    });

    it('returns focus to the trigger when the menu closes via item activation', async () => {
      const {fixture} = await render(BasicMenuHost);
      getTrigger().focus();
      openMenu(fixture);

      await userEvent.click(getItem('Banana'));
      expect(getTrigger()).toHaveFocus();
    });

    it('returns focus to the trigger when Tab closes the menu', async () => {
      const {fixture} = await render(BasicMenuHost);
      getTrigger().focus();
      openMenu(fixture);

      const ev = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      getMenu().dispatchEvent(ev);
      expect(getTrigger()).toHaveFocus();
    });
  });

  describe('item activation', () => {
    it('Enter on a focused item dispatches click and closes the menu', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);

      const banana = getItem('Banana');
      banana.focus();

      const clickSpy = vi.fn();
      banana.addEventListener('click', clickSpy);

      await userEvent.keyboard('{Enter}');

      expect(clickSpy).toHaveBeenCalled();
      expect(queryMenu()).not.toBeInTheDocument();
    });

    it('Space on a focused item dispatches click and closes the menu', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);

      const banana = getItem('Banana');
      banana.focus();

      const clickSpy = vi.fn();
      banana.addEventListener('click', clickSpy);

      await userEvent.keyboard(' ');

      expect(clickSpy).toHaveBeenCalled();
      expect(queryMenu()).not.toBeInTheDocument();
    });

    it('after activation via Enter, focus returns to the trigger', async () => {
      const {fixture} = await render(BasicMenuHost);
      getTrigger().focus();
      openMenu(fixture);

      getItem('Banana').focus();
      await userEvent.keyboard('{Enter}');
      expect(getTrigger()).toHaveFocus();
    });
  });

  describe('typeahead', () => {
    it('jumps to the first item whose text starts with the typed char', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);

      await userEvent.keyboard('b');
      expect(getItem('Banana')).toHaveFocus();
    });

    it('matches a multi-character prefix typed within the reset window', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);

      await userEvent.keyboard('ch');
      expect(getItem('Cherry')).toHaveFocus();
    });

    it('resets the buffer after the timeout', async () => {
      vi.useFakeTimers();
      try {
        const {fixture} = await render(BasicMenuHost);
        openMenu(fixture);

        const menu = getMenu();
        menu.dispatchEvent(
          new KeyboardEvent('keydown', {key: 'b', bubbles: true, cancelable: true}),
        );
        expect(getItem('Banana')).toHaveFocus();

        vi.advanceTimersByTime(Menu.TYPEAHEAD_RESET_MS + 1);

        menu.dispatchEvent(
          new KeyboardEvent('keydown', {key: 'a', bubbles: true, cancelable: true}),
        );
        expect(getItem('Apple')).toHaveFocus();
      } finally {
        vi.useRealTimers();
      }
    });

    it('is case-insensitive', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);

      await userEvent.keyboard('C');
      expect(getItem('Cherry')).toHaveFocus();
    });

    it('ignores characters typed with a modifier held', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);

      const apple = getItem('Apple');
      apple.focus();

      getMenu().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'b',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(apple).toHaveFocus();
    });

    it('typing a character with no matching item is a no-op', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      const apple = getItem('Apple');
      expect(apple).toHaveFocus();

      await userEvent.keyboard('z');
      expect(apple).toHaveFocus();
    });
  });

  describe('data-highlighted', () => {
    it('is set on the focused item and follows arrow-key navigation', async () => {
      const {fixture} = await render(BasicMenuHost);
      openMenu(fixture);

      expect(getItem('Apple')).toHaveAttribute('data-highlighted');

      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Banana')).toHaveAttribute('data-highlighted');
      expect(getItem('Apple')).not.toHaveAttribute('data-highlighted');
    });
  });

  describe('dynamic items', () => {
    it('focuses the first item after opening a dynamically-built menu', async () => {
      const {fixture} = await render(DynamicMenuHost);
      openMenu(fixture);
      expect(getItem('Alpha')).toHaveFocus();
    });

    it('re-computes the tab stop when items change while open', async () => {
      const {fixture} = await render(DynamicMenuHost);
      openMenu(fixture);
      getItem('Alpha').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(getItem('Beta')).toHaveFocus();

      fixture.componentInstance.labels.set(['Alpha', 'Gamma']);
      fixture.detectChanges();

      expect(getItem('Alpha')).toHaveAttribute('tabindex', '0');
      expect(getItem('Gamma')).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('submenu', () => {
    it('ArrowRight on a focused submenu trigger opens the child menu', async () => {
      const {fixture} = await render(SubmenuHost);
      openMenu(fixture);
      getItem('More').focus();
      await userEvent.keyboard('{ArrowRight}');

      expect(screen.getByRole('menu', {name: 'More'})).toBeInTheDocument();
    });

    it('opened submenu focuses its first item', async () => {
      const {fixture} = await render(SubmenuHost);
      openMenu(fixture);
      getItem('More').focus();
      await userEvent.keyboard('{ArrowRight}');

      expect(getItem('Sub One')).toHaveFocus();
    });

    it('ArrowLeft on an open submenu closes it and returns focus to the parent trigger', async () => {
      const {fixture} = await render(SubmenuHost);
      openMenu(fixture);
      getItem('More').focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByRole('menu', {name: 'More'})).toBeInTheDocument();

      await userEvent.keyboard('{ArrowLeft}');
      expect(screen.queryByRole('menu', {name: 'More'})).not.toBeInTheDocument();
      expect(screen.getByRole('menu', {name: 'Top'})).toBeInTheDocument();
      expect(getItem('More')).toHaveFocus();
    });

    it('Escape closes only the current submenu level, not the parent chain', async () => {
      const {fixture} = await render(SubmenuHost);
      openMenu(fixture);
      getItem('More').focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByRole('menu', {name: 'More'})).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('menu', {name: 'More'})).not.toBeInTheDocument();
      expect(screen.getByRole('menu', {name: 'Top'})).toBeInTheDocument();
    });

    it('activating an item in the child closes the entire chain', async () => {
      const {fixture} = await render(SubmenuHost);
      openMenu(fixture);
      getItem('More').focus();
      await userEvent.keyboard('{ArrowRight}');

      getItem('Sub One').focus();
      await userEvent.keyboard('{Enter}');

      expect(screen.queryByRole('menu', {name: 'More'})).not.toBeInTheDocument();
      expect(screen.queryByRole('menu', {name: 'Top'})).not.toBeInTheDocument();
    });

    it('submenu trigger exposes aria-haspopup="menu"', async () => {
      const {fixture} = await render(SubmenuHost);
      openMenu(fixture);
      expect(getItem('More')).toHaveAttribute('aria-haspopup', 'menu');
    });
  });

  describe('axe a11y', () => {
    it('closed menu (trigger only) has no violations', async () => {
      const {container} = await render(BasicMenuHost);
      await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
    });

    it('open menu with focusable items has no violations', async () => {
      const {container, fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      const menu = getMenu();
      expect(within(menu).getAllByRole('menuitem')).toHaveLength(3);
      await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
    });

    it('menu containing a hard-disabled item has no violations', async () => {
      const {container, fixture} = await render(DisabledItemMenuHost);
      openMenu(fixture);
      await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
    });

    it('submenu chain: parent + open child both clean', async () => {
      const {container, fixture} = await render(SubmenuHost);
      openMenu(fixture);
      getItem('More').focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByRole('menu', {name: 'More'})).toBeInTheDocument();
      await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
    });

    it('reopen cycle stays clean', async () => {
      const {container, fixture} = await render(BasicMenuHost);
      openMenu(fixture);
      await expect(expectNoA11yViolations(container)).resolves.not.toThrow();

      await userEvent.keyboard('{Escape}');
      await expect(expectNoA11yViolations(container)).resolves.not.toThrow();

      openMenu(fixture);
      await expect(expectNoA11yViolations(container)).resolves.not.toThrow();
    });
  });
});
