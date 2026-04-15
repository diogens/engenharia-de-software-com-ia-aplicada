import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('submits the form and updates the card list', async ({ page }) => {
  const cardItems = page.locator('#card-list article');
  const initialCount = await cardItems.count();

  await page.fill('#title', 'Playwright Card');
  await page.fill('#imageUrl', 'https://picsum.photos/300');
  await page.click('#btnSubmit');

  await expect(cardItems).toHaveCount(initialCount + 1);
  await expect(page.locator('#card-list .card-title').last()).toHaveText('Playwright Card');
});

test('validates required and invalid url fields', async ({ page }) => {
  const form = page.locator('form.needs-validation');
  const cardItems = page.locator('#card-list article');
  const initialCount = await cardItems.count();

  await page.click('#btnSubmit');

  await expect(form).toHaveClass(/was-validated/);
  await expect(page.locator('#title')).toBeFocused();
  await expect(cardItems).toHaveCount(initialCount);

  await page.fill('#title', 'Only title');
  await page.fill('#imageUrl', 'invalid-url');
  await page.click('#btnSubmit');

  await expect(form).toHaveClass(/was-validated/);
  await expect(page.locator('#imageUrl')).toBeFocused();
  await expect(cardItems).toHaveCount(initialCount);
});
