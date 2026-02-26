import { expect, test } from '@playwright/test';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturePath = join(__dirname, 'fixtures', 'playlist.json');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const win = window as unknown as {
      YT?: {
        Player: new (
          element: HTMLDivElement,
          options: {
            videoId: string;
            playerVars?: { autoplay?: number; controls?: number; rel?: number };
            events?: {
              onReady?: (event: {
                target: { loadVideoById: (args: { videoId: string }) => void };
              }) => void;
              onStateChange?: (event: { data: number }) => void;
              onError?: () => void;
            };
          }
        ) => { loadVideoById: (args: { videoId: string }) => void };
        PlayerState: { ENDED: number };
      };
    };

    class MockPlayer {
      loadVideoById(_args: { videoId: string }) {
        // no-op: UI is driven by store state, not iframe.
      }

      constructor(
        _element: HTMLDivElement,
        options: {
          events?: { onReady?: (event: { target: MockPlayer }) => void };
        }
      ) {
        setTimeout(() => {
          options.events?.onReady?.({ target: this });
        }, 0);
      }
    }

    win.YT = {
      Player: MockPlayer,
      PlayerState: { ENDED: 0 }
    };
  });
});

test('load playlist json then interact with queue and controls', async ({ page }) => {
  await page.goto('/home');

  const fileInput = page.locator('input[type="file"][accept*=".json"]');
  await fileInput.setInputFiles(fixturePath);

  const nowPlaying = page.getByText(/Now playing:/i);

  // Verify playlist loaded (has content)
  await expect(nowPlaying).not.toBeEmpty();

  // Get initial now playing text
  const initialText = await nowPlaying.textContent();

  // Click next and verify it changes
  await page.getByRole('button', { name: 'Next' }).click();
  const afterNextText = await nowPlaying.textContent();
  expect(afterNextText).not.toBe(initialText);

  // Click previous and verify it's back to initial
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(nowPlaying).toContainText(initialText || '');

  // Click on queue item 3 and verify it changes
  await page.getByRole('button', { name: /^3\./i }).click();
  const afterQueueClickText = await nowPlaying.textContent();
  expect(afterQueueClickText).not.toBe(initialText);
});
