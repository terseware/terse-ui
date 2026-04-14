import {expect, test, type Page} from '@playwright/test';

/**
 * Menu disable-state e2e tests for `@terseware/ui/menu`.
 *
 * Verifies the hard/soft disable contract for both native (`<button>`) and
 * non-native (`<span>`) menu items:
 *
 *  - **Hard-disabled** items are skipped entirely — not focusable via
 *    roving focus, not activatable.
 *  - **Soft-disabled** items remain focusable via roving focus (so the user
 *    can see them while navigating), but activation (click / Enter / Space)
 *    is blocked.
 *
 * Fixture: tests/ui-tests/src/app/fixtures/menu/menu-disable-fixture.ts
 */
test.describe('menu disable', () => {
  // Item labels are substrings of each other ("Native Enabled" ⊂ "Non-Native
  // Enabled"), so every menuitem lookup must use exact matching.
  const item = (page: Page, name: string) => page.getByRole('menuitem', {name, exact: true});

  const openMenu = async (page: Page) => {
    await page.getByRole('button', {name: 'Menu Trigger'}).click();
    await expect(page.getByRole('menu')).toBeVisible();
  };

  test.beforeEach(async ({page}) => {
    await page.goto('/menu-disable');
  });

  // ---------------------------------------------------------------------------
  // ARIA contract for each disable state × element type
  // ---------------------------------------------------------------------------
  test.describe('aria', () => {
    test('enabled items expose no disabled attributes', async ({page}) => {
      await openMenu(page);

      for (const name of ['Native Enabled', 'Non-Native Enabled']) {
        const el = item(page, name);
        await expect(el).not.toHaveAttribute('disabled', /.*/);
        await expect(el).not.toHaveAttribute('aria-disabled', /.*/);
        await expect(el).not.toHaveAttribute('data-disabled', /.*/);
      }
    });

    test('native hard-disabled has disabled="" and data-disabled="hard"', async ({page}) => {
      await openMenu(page);
      const el = item(page, 'Native Hard Disabled');

      await expect(el).toHaveAttribute('disabled', '');
      await expect(el).toHaveAttribute('data-disabled', 'hard');
    });

    test('native soft-disabled has aria-disabled="true" and data-disabled="soft"', async ({
      page,
    }) => {
      await openMenu(page);
      const el = item(page, 'Native soft Disabled');

      // Soft-disabled natives stay focusable, so no `disabled` attribute
      await expect(el).not.toHaveAttribute('disabled', /.*/);
      await expect(el).toHaveAttribute('aria-disabled', 'true');
      await expect(el).toHaveAttribute('data-disabled', 'soft');
    });

    test('non-native hard-disabled has aria-disabled="true" and data-disabled="hard"', async ({
      page,
    }) => {
      await openMenu(page);
      const el = item(page, 'Non-Native Hard Disabled');

      await expect(el).not.toHaveAttribute('disabled', /.*/);
      await expect(el).toHaveAttribute('aria-disabled', 'true');
      await expect(el).toHaveAttribute('data-disabled', 'hard');
    });

    test('non-native soft-disabled has aria-disabled="true" and data-disabled="soft"', async ({
      page,
    }) => {
      await openMenu(page);
      const el = item(page, 'Non-Native soft Disabled');

      await expect(el).not.toHaveAttribute('disabled', /.*/);
      await expect(el).toHaveAttribute('aria-disabled', 'true');
      await expect(el).toHaveAttribute('data-disabled', 'soft');
    });
  });

  // ---------------------------------------------------------------------------
  // Roving focus behavior
  // ---------------------------------------------------------------------------
  test.describe('roving focus', () => {
    test('opening the menu focuses the first enabled item', async ({page}) => {
      await openMenu(page);
      await expect(item(page, 'Native Enabled')).toBeFocused();
    });

    test('ArrowDown walks through soft-disabled items but skips hard-disabled', async ({page}) => {
      await openMenu(page);
      await expect(item(page, 'Native Enabled')).toBeFocused();

      // Skip "Native Hard Disabled", land on "Native soft Disabled"
      await page.keyboard.press('ArrowDown');
      await expect(item(page, 'Native soft Disabled')).toBeFocused();

      await page.keyboard.press('ArrowDown');
      await expect(item(page, 'Non-Native Enabled')).toBeFocused();

      // Skip "Non-Native Hard Disabled", land on "Non-Native soft Disabled"
      await page.keyboard.press('ArrowDown');
      await expect(item(page, 'Non-Native soft Disabled')).toBeFocused();

      // Wrap back to first enabled
      await page.keyboard.press('ArrowDown');
      await expect(item(page, 'Native Enabled')).toBeFocused();
    });

    test('ArrowUp walks backward through soft-disabled items but skips hard-disabled', async ({
      page,
    }) => {
      await openMenu(page);
      await expect(item(page, 'Native Enabled')).toBeFocused();

      // Wrap up to last enabled-or-soft
      await page.keyboard.press('ArrowUp');
      await expect(item(page, 'Non-Native soft Disabled')).toBeFocused();

      // Skip "Non-Native Hard Disabled"
      await page.keyboard.press('ArrowUp');
      await expect(item(page, 'Non-Native Enabled')).toBeFocused();

      await page.keyboard.press('ArrowUp');
      await expect(item(page, 'Native soft Disabled')).toBeFocused();

      // Skip "Native Hard Disabled"
      await page.keyboard.press('ArrowUp');
      await expect(item(page, 'Native Enabled')).toBeFocused();
    });

    test('End focuses the last enabled-or-soft item (skips trailing hard-disabled)', async ({
      page,
    }) => {
      await openMenu(page);
      await expect(item(page, 'Native Enabled')).toBeFocused();

      await page.keyboard.press('End');
      await expect(item(page, 'Non-Native soft Disabled')).toBeFocused();
    });

    test('Home focuses the first enabled item', async ({page}) => {
      await openMenu(page);
      await expect(item(page, 'Native Enabled')).toBeFocused();

      await page.keyboard.press('End');
      await page.keyboard.press('Home');
      await expect(item(page, 'Native Enabled')).toBeFocused();
    });

    test('hard-disabled items are never tab-stops', async ({page}) => {
      await openMenu(page);

      // All hard-disabled items should have tabindex=-1 regardless of roving state
      await expect(item(page, 'Native Hard Disabled')).toHaveAttribute('tabindex', '-1');
      await expect(item(page, 'Non-Native Hard Disabled')).toHaveAttribute('tabindex', '-1');
    });
  });

  // ---------------------------------------------------------------------------
  // Activation blocking
  // ---------------------------------------------------------------------------
  test.describe('activation', () => {
    test('clicking an enabled native item closes the menu', async ({page}) => {
      await openMenu(page);
      await item(page, 'Native Enabled').click();
      await expect(page.getByRole('menu')).toBeHidden();
    });

    test('clicking an enabled non-native item closes the menu', async ({page}) => {
      await openMenu(page);
      await item(page, 'Non-Native Enabled').click();
      await expect(page.getByRole('menu')).toBeHidden();
    });

    test('clicking a native soft-disabled item does NOT close the menu', async ({page}) => {
      await openMenu(page);
      // `aria-disabled="true"` makes Playwright treat the item as not-enabled,
      // so we need `force: true` to send the click at all. Activatable's
      // capture-phase handler should still block the activation.
      await item(page, 'Native soft Disabled').click({force: true});
      await expect(page.getByRole('menu')).toBeVisible();
    });

    test('clicking a non-native soft-disabled item does NOT close the menu', async ({page}) => {
      await openMenu(page);
      await item(page, 'Non-Native soft Disabled').click({force: true});
      await expect(page.getByRole('menu')).toBeVisible();
    });

    test('clicking a non-native hard-disabled item does NOT close the menu', async ({page}) => {
      await openMenu(page);
      await item(page, 'Non-Native Hard Disabled').click({force: true});
      await expect(page.getByRole('menu')).toBeVisible();
    });

    test('Enter on a soft-disabled item does NOT close the menu', async ({page}) => {
      await openMenu(page);
      await expect(item(page, 'Native Enabled')).toBeFocused();

      // Walk focus to the soft-disabled item
      await page.keyboard.press('ArrowDown');
      await expect(item(page, 'Native soft Disabled')).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(item(page, 'Native soft Disabled')).toBeFocused();
    });

    test('Space on a soft-disabled item does NOT close the menu', async ({page}) => {
      await openMenu(page);
      await expect(item(page, 'Native Enabled')).toBeFocused();

      await page.keyboard.press('End');
      await expect(item(page, 'Non-Native soft Disabled')).toBeFocused();

      await page.keyboard.press(' ');
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(item(page, 'Non-Native soft Disabled')).toBeFocused();
    });
  });
});
