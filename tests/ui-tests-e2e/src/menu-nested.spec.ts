import {expect, test, type Page} from '@playwright/test';

/**
 * Nested menu (submenu) e2e tests for `@terseware/ui/menu`.
 *
 * Validates that the same `MenuTrigger` directive powers both the top-level
 * trigger button and in-menu submenu triggers via DI context detection, and
 * that close-reason propagation does the right thing at each level:
 *
 *  - Activating a leaf item closes the entire chain (reason: 'click')
 *  - Escape / ArrowLeft close only the current level (reason: 'escape')
 *  - Tab / outside click collapse everything (reasons: 'tab' | 'outside')
 *
 * Fixture: tests/ui-tests/src/app/fixtures/menu/menu-nested-fixture.ts
 */
test.describe('nested menu', () => {
  const getMenus = (page: Page) => page.getByRole('menu');
  const getMenuitems = (page: Page) => page.getByRole('menuitem');
  const item = (page: Page, name: string) => page.getByRole('menuitem', {name, exact: true});

  const openTop = async (page: Page) => {
    await page.getByRole('button', {name: 'Animal Index'}).click();
    await expect(getMenus(page)).toHaveCount(1);
  };

  const openVertebrates = async (page: Page) => {
    await openTop(page);
    // ArrowDown already focused the first item (Vertebrates). Use ArrowRight
    // to open the submenu via the same MenuTrigger directive that handles
    // the top-level trigger.
    await expect(item(page, 'Vertebrates')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(getMenus(page)).toHaveCount(2);
  };

  test.beforeEach(async ({page}) => {
    await page.goto('/menu-nested');
  });

  // ---------------------------------------------------------------------------
  // Structure / ARIA
  // ---------------------------------------------------------------------------
  test.describe('structure', () => {
    test('only the top-level trigger is visible initially', async ({page}) => {
      await expect(page.getByRole('button', {name: 'Animal Index'})).toBeVisible();
      await expect(getMenus(page)).toHaveCount(0);
    });

    test('submenu-trigger items expose menuitem role and aria-haspopup=menu', async ({page}) => {
      await openTop(page);
      const vertebrates = item(page, 'Vertebrates');
      const invertebrates = item(page, 'Invertebrates');

      for (const trigger of [vertebrates, invertebrates]) {
        await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      }
    });

    test('opening a submenu flips aria-expanded on the submenu-trigger item', async ({page}) => {
      await openVertebrates(page);
      await expect(item(page, 'Vertebrates')).toHaveAttribute('aria-expanded', 'true');
      // Sibling submenu trigger stays collapsed
      await expect(item(page, 'Invertebrates')).toHaveAttribute('aria-expanded', 'false');
    });

    test('both menus are simultaneously present when a submenu is open', async ({page}) => {
      await openVertebrates(page);
      // 2 menu elements: parent + child
      await expect(getMenus(page)).toHaveCount(2);
      // Parent items + child items
      await expect(getMenuitems(page)).toHaveCount(2 + 5);
    });
  });

  // ---------------------------------------------------------------------------
  // Opening a submenu
  // ---------------------------------------------------------------------------
  test.describe('opening', () => {
    test('clicking the submenu-trigger item opens the child menu', async ({page}) => {
      await openTop(page);
      await item(page, 'Vertebrates').click();
      await expect(getMenus(page)).toHaveCount(2);
      await expect(item(page, 'Vertebrates')).toHaveAttribute('aria-expanded', 'true');
    });

    test('ArrowRight on a focused submenu-trigger opens the child and focuses first item', async ({
      page,
    }) => {
      await openTop(page);
      await expect(item(page, 'Vertebrates')).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(getMenus(page)).toHaveCount(2);
      await expect(item(page, 'Fish')).toBeFocused();
    });

    test('roving down to a submenu trigger, then ArrowRight, targets the correct submenu', async ({
      page,
    }) => {
      await openTop(page);
      await expect(item(page, 'Vertebrates')).toBeFocused();

      await page.keyboard.press('ArrowDown');
      await expect(item(page, 'Invertebrates')).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(getMenus(page)).toHaveCount(2);
      await expect(item(page, 'Insects')).toBeFocused();
      // Vertebrates stays closed
      await expect(item(page, 'Vertebrates')).toHaveAttribute('aria-expanded', 'false');
    });

    test('opening a different submenu does not leave two submenus open', async ({page}) => {
      await openVertebrates(page);

      // ArrowLeft closes the Vertebrates submenu and returns focus to its trigger
      await page.keyboard.press('ArrowLeft');
      await expect(getMenus(page)).toHaveCount(1);
      await expect(item(page, 'Vertebrates')).toBeFocused();

      // Walk down to Invertebrates and open that one
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowRight');
      await expect(getMenus(page)).toHaveCount(2);
      await expect(item(page, 'Insects')).toBeFocused();
    });
  });

  // ---------------------------------------------------------------------------
  // Closing only the submenu (reason: 'escape')
  // ---------------------------------------------------------------------------
  test.describe('closing only the submenu', () => {
    test('ArrowLeft in the submenu closes it and refocuses its trigger item', async ({page}) => {
      await openVertebrates(page);
      await expect(item(page, 'Fish')).toBeFocused();

      await page.keyboard.press('ArrowLeft');
      await expect(getMenus(page)).toHaveCount(1);
      await expect(item(page, 'Vertebrates')).toBeFocused();
      await expect(item(page, 'Vertebrates')).toHaveAttribute('aria-expanded', 'false');
    });

    test('Escape in the submenu closes only that level', async ({page}) => {
      await openVertebrates(page);
      await expect(item(page, 'Fish')).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(getMenus(page)).toHaveCount(1);
      await expect(item(page, 'Vertebrates')).toBeFocused();

      // Another Escape closes the parent too
      await page.keyboard.press('Escape');
      await expect(getMenus(page)).toHaveCount(0);
      await expect(page.getByRole('button', {name: 'Animal Index'})).toBeFocused();
    });
  });

  // ---------------------------------------------------------------------------
  // Closing the entire chain (reasons: 'click' | 'tab' | 'outside')
  // ---------------------------------------------------------------------------
  test.describe('closing the chain', () => {
    test('clicking a leaf item in the submenu closes everything', async ({page}) => {
      await openVertebrates(page);
      await item(page, 'Birds').click();

      await expect(getMenus(page)).toHaveCount(0);
      await expect(page.getByRole('button', {name: 'Animal Index'})).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    test('Enter on a focused leaf item in the submenu closes everything', async ({page}) => {
      await openVertebrates(page);
      // Walk down to Reptiles and activate it
      await page.keyboard.press('ArrowDown'); // Amphibians
      await page.keyboard.press('ArrowDown'); // Reptiles
      await expect(item(page, 'Reptiles')).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(getMenus(page)).toHaveCount(0);
      await expect(page.getByRole('button', {name: 'Animal Index'})).toBeFocused();
    });

    test('Tab while inside a submenu collapses the entire chain', async ({page}) => {
      await openVertebrates(page);
      await page.keyboard.press('Tab');
      await expect(getMenus(page)).toHaveCount(0);
    });

    test('clicking outside any menu closes the whole chain', async ({page}) => {
      await openVertebrates(page);
      await page.mouse.click(5, 5);
      await expect(getMenus(page)).toHaveCount(0);
    });

    test('Escape on the top-level menu while a submenu is open collapses both', async ({page}) => {
      await openVertebrates(page);
      // Move focus back to the parent by closing the submenu first
      await page.keyboard.press('ArrowLeft');
      await expect(item(page, 'Vertebrates')).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(getMenus(page)).toHaveCount(0);
      await expect(page.getByRole('button', {name: 'Animal Index'})).toBeFocused();
    });
  });
});
