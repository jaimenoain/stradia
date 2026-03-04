import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {

  test('Redirects to login if unauthenticated', async ({ page }) => {
    await page.goto('/admin/customers');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Shows Skeleton during loading and Empty State when no customers exist', async ({ page }) => {
    // Navigate immediately to the test-components route
    const navigatePromise = page.goto('/test-components');

    // As soon as navigation begins, we should see the loading.tsx Skeleton component.
    // The previous test missed it because page.goto waits for "load" event which happens *after* the async page resolves.

    // Find the skeleton loader before the page has finished loading
    const skeleton = page.locator('.animate-pulse').first();
    await expect(skeleton).toBeVisible();

    // Await the navigation to finish resolving the simulated network latency
    await navigatePromise;

    // The Empty State should now be mounted
    const emptyStateTitle = page.locator('text="No customers added"');
    await expect(emptyStateTitle).toBeVisible();
  });

});
