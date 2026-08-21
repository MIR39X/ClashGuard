import { expect, test } from '@playwright/test';

test('archive landing page is responsive and old routes return home', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /it guarded the clashes/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /explore the repository/i })).toHaveAttribute(
    'href',
    'https://github.com/MIR39X/ClashGuard',
  );
  await expect(page.getByText('February', { exact: true })).toBeVisible();
  await expect(page.getByText('June', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole('heading', { name: /it guarded the clashes/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /explore the repository/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto('/select');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /it guarded the clashes/i })).toBeVisible();
});
