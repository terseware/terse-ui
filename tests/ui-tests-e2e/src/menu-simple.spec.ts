import {expect, test} from '@playwright/test';

/**
 * Menu primitive (`@terseware/ui/menu`) e2e tests.
 *
 * Adheres to the WAI-ARIA Menu Button pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 *
 * Fixture: tests/ui-tests/src/app/fixtures/menu/menu-fixture.ts
 */
test.describe('menu', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/menu');
  });

  // ---------------------------------------------------------------------------
  // ARIA contract
  // ---------------------------------------------------------------------------
  test.describe('aria', () => {
    test('trigger exposes menu-button ARIA in closed state', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});

      await expect(trigger).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toHaveAttribute('data-closed', '');
    });

    test('trigger exposes expanded state and aria-controls when open', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.click();

      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      await expect(menu).toHaveAttribute('id', /.+/);

      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(trigger).toHaveAttribute('data-opened', '');

      // aria-controls should reference the menu's generated id
      const menuId = await menu.evaluate((el) => el.id);
      await expect(trigger).toHaveAttribute('aria-controls', menuId);
    });

    test('menu exposes role=menu with four menuitem children', async ({page}) => {
      await page.getByRole('button', {name: 'Menu Trigger'}).click();

      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      await expect(menu.getByRole('menuitem')).toHaveCount(4);
    });
  });

  // ---------------------------------------------------------------------------
  // Opening
  // ---------------------------------------------------------------------------
  test.describe('opening', () => {
    test('click opens the menu and focuses the first item', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.click();

      const items = page.getByRole('menuitem');
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(items.first()).toBeFocused();
    });

    test('Enter on the trigger opens the menu', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.focus();
      await page.keyboard.press('Enter');

      await expect(page.getByRole('menu')).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    test('Space on the trigger opens the menu', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.focus();
      await page.keyboard.press(' ');

      await expect(page.getByRole('menu')).toBeVisible();
    });

    test('ArrowDown on the trigger opens and focuses the first item', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.focus();
      await page.keyboard.press('ArrowDown');

      const items = page.getByRole('menuitem');
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(items.first()).toBeFocused();
    });

    test('ArrowUp on the trigger opens and focuses the last item', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.focus();
      await page.keyboard.press('ArrowUp');

      const items = page.getByRole('menuitem');
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(items.last()).toBeFocused();
    });
  });

  // ---------------------------------------------------------------------------
  // Closing
  // ---------------------------------------------------------------------------
  test.describe('closing', () => {
    test('Escape closes the menu and returns focus to the trigger', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.click();
      await expect(page.getByRole('menu')).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(page.getByRole('menu')).toBeHidden();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toBeFocused();
    });

    test('Tab closes the menu', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.click();
      await expect(page.getByRole('menu')).toBeVisible();

      await page.keyboard.press('Tab');

      await expect(page.getByRole('menu')).toBeHidden();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('clicking outside closes the menu', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.click();
      await expect(page.getByRole('menu')).toBeVisible();

      // Click somewhere outside both the menu and the trigger
      await page.mouse.click(5, 5);

      await expect(page.getByRole('menu')).toBeHidden();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('activating a menu item closes the menu', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.click();

      await page.getByRole('menuitem', {name: 'Menu Item 2'}).click();

      await expect(page.getByRole('menu')).toBeHidden();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('activating an item with Enter closes the menu and returns focus', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.click();
      await expect(page.getByRole('menuitem').first()).toBeFocused();

      await page.keyboard.press('Enter');

      await expect(page.getByRole('menu')).toBeHidden();
      await expect(trigger).toBeFocused();
    });

    test('re-clicking the trigger while open closes the menu', async ({page}) => {
      const trigger = page.getByRole('button', {name: 'Menu Trigger'});
      await trigger.click();
      await expect(page.getByRole('menu')).toBeVisible();

      await trigger.click();
      await expect(page.getByRole('menu')).toBeHidden();
    });
  });

  // ---------------------------------------------------------------------------
  // Roving focus / keyboard navigation
  // ---------------------------------------------------------------------------
  test.describe('keyboard navigation', () => {
    test('ArrowDown moves focus to the next item', async ({page}) => {
      await page.getByRole('button', {name: 'Menu Trigger'}).click();
      const items = page.getByRole('menuitem');
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('ArrowDown');
      await expect(items.nth(1)).toBeFocused();

      await page.keyboard.press('ArrowDown');
      await expect(items.nth(2)).toBeFocused();
    });

    test('ArrowUp moves focus to the previous item', async ({page}) => {
      await page.getByRole('button', {name: 'Menu Trigger'}).click();
      const items = page.getByRole('menuitem');
      await expect(items.first()).toBeFocused();

      // Jump to the last item using End, then walk backward
      await page.keyboard.press('End');
      await expect(items.last()).toBeFocused();

      await page.keyboard.press('ArrowUp');
      await expect(items.nth(2)).toBeFocused();
    });

    test('Home focuses the first item', async ({page}) => {
      await page.getByRole('button', {name: 'Menu Trigger'}).click();
      const items = page.getByRole('menuitem');
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('End');
      await expect(items.last()).toBeFocused();

      await page.keyboard.press('Home');
      await expect(items.first()).toBeFocused();
    });

    test('End focuses the last item', async ({page}) => {
      await page.getByRole('button', {name: 'Menu Trigger'}).click();
      const items = page.getByRole('menuitem');
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('End');
      await expect(items.last()).toBeFocused();
    });

    test('ArrowDown on the last item wraps to the first', async ({page}) => {
      await page.getByRole('button', {name: 'Menu Trigger'}).click();
      const items = page.getByRole('menuitem');
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('End');
      await expect(items.last()).toBeFocused();

      await page.keyboard.press('ArrowDown');
      await expect(items.first()).toBeFocused();
    });

    test('ArrowUp on the first item wraps to the last', async ({page}) => {
      await page.getByRole('button', {name: 'Menu Trigger'}).click();
      const items = page.getByRole('menuitem');
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('ArrowUp');
      await expect(items.last()).toBeFocused();
    });
  });

  // ---------------------------------------------------------------------------
  // Pointer behavior
  // ---------------------------------------------------------------------------
  test.describe('pointer', () => {
    test('hovering a menu item moves focus to it (roving)', async ({page}) => {
      await page.getByRole('button', {name: 'Menu Trigger'}).click();
      const items = page.getByRole('menuitem');
      await expect(items.first()).toBeFocused();

      await items.nth(2).hover();
      await expect(items.nth(2)).toBeFocused();
    });

    test('hovered item receives data-highlighted', async ({page}) => {
      await page.getByRole('button', {name: 'Menu Trigger'}).click();
      const third = page.getByRole('menuitem', {name: 'Menu Item 3'});

      await third.hover();
      await expect(third).toHaveAttribute('data-highlighted', '');
    });
  });

  // ---------------------------------------------------------------------------
  // Typeahead
  // ---------------------------------------------------------------------------
  test.describe('typeahead', () => {
    test('typing a character focuses the matching item by prefix', async ({page}) => {
      await page.getByRole('button', {name: 'Menu Trigger'}).click();
      const items = page.getByRole('menuitem');
      await expect(items.first()).toBeFocused();

      // All items start with "Menu Item" — typing "m" matches the first
      await page.keyboard.press('m');
      await expect(items.first()).toBeFocused();
    });
  });
});
