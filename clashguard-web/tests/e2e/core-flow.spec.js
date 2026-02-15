import { expect, test } from '@playwright/test';

const classesPayload = [
  {
    id: 'mta-1',
    title: 'MT2005-Prob BDS-4A',
    course: 'MT2005',
    section: 'BDS-4A',
    teacher: 'Muhammad Amjad',
    room: 'E-33 Academic Block II (52)',
    day: 'Wednesday',
    start: '08:55',
    end: '09:45',
    startMinutes: 535,
    endMinutes: 585,
  },
  {
    id: 'cy-1',
    title: 'CY4045-BLKC BCY-6A',
    course: 'CY4045',
    section: 'BCY-6A',
    teacher: 'Nouman Rajput',
    room: 'Academic Block II Lab-13 (47)',
    day: 'Wednesday',
    start: '08:55',
    end: '09:45',
    startMinutes: 535,
    endMinutes: 585,
  },
  {
    id: 'mtb-1',
    title: 'MT2005-Prob BDS-4B',
    course: 'MT2005',
    section: 'BDS-4B',
    teacher: 'Muhammad Amjad',
    room: 'E-34 Academic Block II (52)',
    day: 'Thursday',
    start: '11:40',
    end: '12:30',
    startMinutes: 700,
    endMinutes: 750,
  },
];

test('core user flow works end-to-end', async ({ page }) => {
  await page.route('**/classes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ classes: classesPayload }),
    });
  });

  await page.goto('/');
  await expect(page.getByText('MT2005-Prob BDS-4A')).toBeVisible();

  const mtCard = page.locator('article').filter({ hasText: 'MT2005-Prob BDS-4A' });
  const cyCard = page.locator('article').filter({ hasText: 'CY4045-BLKC BCY-6A' });
  await mtCard.getByRole('button', { name: 'Add' }).click();
  await cyCard.getByRole('button', { name: 'Add' }).click();

  await page.getByRole('button', { name: 'View My Timetable' }).click();
  await expect(page.getByText('[02]_MY TIMETABLE')).toBeVisible();

  await page.getByRole('button', { name: 'Clash Report' }).first().click();
  await expect(page.getByText('[03]_CLASH REPORT')).toBeVisible();
  await expect(page.getByText(/clashes found:\s*1/i)).toBeVisible();

  await page.getByRole('button', { name: 'Alternatives' }).first().click();
  await expect(page.getByText('[04]_ALTERNATIVES')).toBeVisible();
  await expect(page.getByText('MT2005-Prob BDS-4B')).toBeVisible();
});

