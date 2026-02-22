import { test, expect } from '@playwright/test';

test.describe('Layouts & Route Groups', () => {

  test('Marketing Layout (/)', async ({ page }) => {
    await page.goto('/');
    // Positive: Marketing header with "Login" link
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).toContainText('Login');

    // Negative: No Dashboard Sidebar
    const sidebar = page.locator('aside');
    await expect(sidebar).not.toBeVisible();
  });

  test('Auth Layout (/login)', async ({ page }) => {
    await page.goto('/login');
    // Positive: Minimalist container (we expect a main container)
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Negative: No Dashboard Sidebar
    const sidebar = page.locator('aside');
    await expect(sidebar).not.toBeVisible();
  });

  const dashboardRoutes = [
    '/overview',
    '/strategies',
    '/settings',
    '/markets/123/board'
  ];

  for (const route of dashboardRoutes) {
    test(`Dashboard Layout (${route})`, async ({ page }) => {
      await page.goto(route);

      // Positive: Sidebar
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();

      // Positive: TopNav
      const topnav = page.locator('header');
      await expect(topnav).toBeVisible();

      // Positive: Page Title <h1>
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    });
  }
});
