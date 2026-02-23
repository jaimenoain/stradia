import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // Check for title using data-slot attribute from CardTitle
    await expect(page.locator('div[data-slot="card-title"]')).toHaveText('Sign in');

    // Check for inputs
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText('Sign In');

    // Take screenshot of login page
    await page.screenshot({ path: 'e2e/screenshots/login_page.png' });
  });

  test('should allow quick login as Global Admin', async ({ page }) => {
    await page.goto('/login');

    // Click on Global Admin quick login
    await page.click('button:has-text("Global Admin")');

    // Wait for navigation
    await page.waitForURL('**/overview');

    // Verify we are on the overview page
    await expect(page).toHaveURL(/\/overview/);

    // Take screenshot of overview page
    await page.screenshot({ path: 'e2e/screenshots/overview_after_login.png' });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill invalid credentials
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Click submit
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.getByText('Invalid email or password')).toBeVisible();

    // Take screenshot of error state
    await page.screenshot({ path: 'e2e/screenshots/login_error.png' });
  });
});
