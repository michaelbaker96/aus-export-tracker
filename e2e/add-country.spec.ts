import { test, expect } from '@playwright/test';

/**
 * Verifies the dynamic "search Comtrade and add a country" flow. The Comtrade
 * lookup is mocked so the test is deterministic and offline.
 */
test('search for an untracked country and add it from Comtrade', async ({ page }) => {
  await page.route('**/api/country-search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        query: 'Qatar',
        match: { code: 634, name: 'Qatar', coords: [51.18, 25.35] },
        hasData: true,
        notFound: ['iron-ore', 'coal'],
        found: [
          {
            resource: 'lng',
            displayName: 'LNG',
            units: { volume: 'PJ (petajoules)', value: 'AUD millions' },
            years: [
              { year: 2023, country: 'Qatar', volume: 12.3, value: 980, royalties: 0, tax: 0 },
            ],
            arc: {
              resourceType: 'lng',
              originCoordinates: [116.85, -20.74],
              destinationCoordinates: [51.18, 25.35],
              destinationCountry: 'Qatar',
              volume: 12.3,
              exportValueAUD: 980,
              royaltiesAUD: 0,
              corporateTaxAUD: 0,
              costBasisMinAUD: 39,
              costBasisMaxAUD: 79,
            },
          },
        ],
      }),
    });
  });

  await page.goto('/');

  const search = page.getByPlaceholder('Search destinations...');
  await expect(search).toBeVisible();

  // Qatar is not in the seeded datasets.
  await expect(page.getByRole('button', { name: 'Hide Qatar' })).toHaveCount(0);

  await search.fill('Qatar');

  const addPanel = page.getByTestId('comtrade-add');
  await expect(addPanel).toBeVisible();

  await page.getByTestId('comtrade-search-btn').click();

  await expect(page.getByText('has Comtrade data for:')).toBeVisible();
  await page.getByTestId('comtrade-add-btn').click();

  // After adding, Qatar appears as a toggleable destination on the map filters.
  await expect(page.getByRole('button', { name: 'Hide Qatar' })).toBeVisible();
});
