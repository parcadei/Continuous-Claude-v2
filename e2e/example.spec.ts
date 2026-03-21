import { test, expect } from '@playwright/test';

test.describe('Example E2E Tests', () => {
  test('loads a page and checks title', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example Domain/);
  });

  test('finds expected content on the page', async ({ page }) => {
    await page.goto('https://example.com');
    const heading = page.getByRole('heading', { name: 'Example Domain' });
    await expect(heading).toBeVisible();
  });

  test('page has a link element', async ({ page }) => {
    await page.goto('https://example.com');
    const link = page.locator('a');
    await expect(link.first()).toBeVisible();
  });
});
