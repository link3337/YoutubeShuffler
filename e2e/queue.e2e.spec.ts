import { expect, test } from '@playwright/test';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturePath = join(__dirname, 'fixtures', 'playlist.json');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const win = window as unknown as { YT?: any };

    class MockPlayer {
      loadVideoById(_args: { videoId: string }) {
        // no-op
      }

      constructor(
        _element: HTMLDivElement,
        options: { events?: { onReady?: (event: { target: MockPlayer }) => void } }
      ) {
        setTimeout(() => options.events?.onReady?.({ target: this }), 0);
      }
    }

    win.YT = { Player: MockPlayer, PlayerState: { ENDED: 0 } };
  });
});

test('manual input loads playlist and enables reshuffle', async ({ page }) => {
  await page.goto('/home');

  await page.getByRole('button', { name: 'Open Manual Input' }).click();

  const manualDialog = page.getByRole('dialog', { name: 'Manual Input' });
  await expect(manualDialog).toBeVisible();

  const textarea = manualDialog.locator('textarea').first();
  await textarea.fill('alpha1234\nbeta5678\ngamma9012');

  await manualDialog.getByRole('button', { name: 'Load + Shuffle' }).click();

  // At least one queue item should appear
  await expect(page.getByRole('button', { name: /^1\./i })).toBeVisible();

  // Reshuffle should be enabled when queue exists
  await expect(page.getByRole('button', { name: 'Reshuffle' })).toBeEnabled();
});

test('import fixture and queue search filters results', async ({ page }) => {
  await page.goto('/home');

  const fileInput = page.locator('input[type="file"][accept*=".json"]');
  await fileInput.setInputFiles(fixturePath);

  // All four entries from fixture should appear
  const first = page.getByRole('button', { name: /^1\./i });
  const second = page.getByRole('button', { name: /^2\./i });
  const third = page.getByRole('button', { name: /^3\./i });
  const fourth = page.getByRole('button', { name: /^4\./i });

  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await expect(third).toBeVisible();
  await expect(fourth).toBeVisible();

  // Use queue search to filter to "Vivarium"
  const search = page.getByPlaceholder('Search queue by title or video ID');
  await search.fill('Vivarium');

  // The matching item should be visible (match by title, indices don't renumber)
  const matched = page.getByRole('button', { name: /Vivarium/i });
  await expect(matched).toBeVisible();

  // Ensure there is exactly one visible queue item after filtering
  const queueButtons = page.locator('.queue-column').locator('role=button');
  await expect(queueButtons).toHaveCount(1);
});
