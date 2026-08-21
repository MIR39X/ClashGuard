import { expect, test } from '@playwright/test';

test('archive landing page is responsive and old routes return home', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'CLASHGUARD' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'VIEW GITHUB REPOSITORY', exact: true })).toHaveAttribute(
    'href',
    'https://github.com/MIR39X/ClashGuard',
  );
  await expect(page.getByText('FEBRUARY 2026', { exact: true })).toBeVisible();
  await expect(page.getByText('JUNE 2026', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole('heading', { level: 1, name: 'CLASHGUARD' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'VIEW GITHUB REPOSITORY', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto('/select');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1, name: 'CLASHGUARD' })).toBeVisible();
});
